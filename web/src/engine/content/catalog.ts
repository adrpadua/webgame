import {
  bossProgramSchema,
  cardSchema,
  chargeModifierSchema,
  encounterSchema,
  evaluationDeckSchema,
  hazardSchema,
  keywordSchema,
  minionSchema,
  scenarioSchema,
  counterSchema,
  type BossBeat,
  type BossProgram,
  type Card,
  type ChargeModifier,
  type EncounterDefinition,
  type EvaluationDeck,
  type Hazard,
  type Keyword,
  type Minion,
  type Scenario,
  type CounterDefinition,
} from './schemas'
import { ENGINE_KEYWORDS, KEYWORD_REFERENCES, type KeywordKind } from '../keywords'
import { ENGINE_COUNTERS, READABLE_READER_PAIRS } from '../counters'
import { EVALUATED_GRANT_WHENS } from '../signature'
import { hexDistance } from '../hex'

// The Beat kinds that ask a distance question, and therefore must author one.
// Kept here rather than beside the resolver because it is a rule about content
// being complete, not about how a Beat resolves — and because the validation
// below has to be able to state both halves: these kinds need a reach, and
// every other kind must not have one.
//
// Typed against the Beat-kind enum rather than left as loose strings. This file
// is the one that renamed every Beat kind once already, and a stale entry here
// would not fail — it would simply stop matching, and the validation below
// would go quiet on the rule it exists to enforce. The annotation turns that
// into a compile error at the moment of the rename.
const RANGED_BEAT_KINDS = new Set<BossBeat['kind']>(['forward_cone', 'demand_proximity'])

export interface ContentCatalog {
  cards: Record<string, Card>
  keywords: Record<string, Keyword>
  chargeModifiers: Record<string, ChargeModifier>
  hazards: Record<string, Hazard>
  minions: Record<string, Minion>
  counters: Record<string, CounterDefinition>
  programs: Record<string, BossProgram>
  encounters: Record<string, EncounterDefinition>
  decks: Record<string, EvaluationDeck>
  scenarios: Record<string, Scenario>
}

// A payload with the file it came from. The loader wraps every JSON module
// this way so a validation failure can name the file a designer has open
// rather than a stack frame inside this module. A bare payload still works —
// tests and generators build content in memory, where there is no file.
export interface SourcedPayload {
  source: string
  payload: unknown
}

function isSourced(entry: unknown): entry is SourcedPayload {
  if (typeof entry !== 'object' || entry === null) {
    return false
  }
  const keys = Object.keys(entry)
  return keys.length === 2 && keys.includes('source') && keys.includes('payload') && typeof (entry as SourcedPayload).source === 'string'
}

export interface RawContent {
  cards: unknown[]
  keywords: unknown[]
  chargeModifiers: unknown[]
  hazards: unknown[]
  minions: unknown[]
  counters?: unknown[]
  programs: unknown[]
  encounters: unknown[]
  decks?: unknown[]
  scenarios?: unknown[]
}

// One parsed entry, still carrying where it came from so duplicate-id and
// cross-reference failures can point at a file too.
interface ParsedEntry<T> {
  value: T
  source: string
}

// How a designer refers to the thing they just edited: the file path if the
// loader supplied one, the authored id otherwise, and the index only when the
// payload is malformed enough to have neither.
function describe(source: string, payload: unknown, index: number): string {
  if (source !== '') {
    return source
  }
  const id = typeof payload === 'object' && payload !== null ? (payload as { id?: unknown }).id : undefined
  return typeof id === 'string' && id !== '' ? `id "${id}"` : `entry ${index}`
}

interface ParseLike<T> {
  parse: (value: unknown) => T
}

interface ZodIssueLike {
  path: PropertyKey[]
  message: string
}

// zod's own error is a field-level report with no idea which file it came
// from, printed as a JSON dump inside a stack trace. Content authoring is the
// one place that error is read by someone who did not write the parser, so it
// is rewritten here as one line naming the file, the id, and each bad field.
function parseAll<T extends { id: string }>(entries: unknown[], schema: ParseLike<T>, label: string): ParsedEntry<T>[] {
  return entries.map((entry, index) => {
    const source = isSourced(entry) ? entry.source : ''
    const payload = isSourced(entry) ? entry.payload : entry
    try {
      return { value: schema.parse(payload), source }
    } catch (error) {
      const issues = (error as { issues?: ZodIssueLike[] }).issues
      if (!issues) {
        throw error
      }
      const detail = issues
        .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`)
        .join('; ')
      throw new Error(`Invalid ${label} in ${describe(source, payload, index)} — ${detail}`)
    }
  })
}

function indexById<T extends { id: string }>(entries: ParsedEntry<T>[], label: string): Record<string, T> {
  const result: Record<string, T> = {}
  const sources: Record<string, string> = {}
  for (const entry of entries) {
    const { id } = entry.value
    if (result[id]) {
      const first = sources[id] === '' ? 'an earlier entry' : sources[id]
      const second = entry.source === '' ? 'a later entry' : entry.source
      throw new Error(`Duplicate ${label} id "${id}": defined in ${first} and again in ${second}`)
    }
    result[id] = entry.value
    sources[id] = entry.source
  }
  return result
}

// One check for every join into the Keyword namespace. The id has to exist,
// and it has to name the right sort of thing — a reference that resolves to a
// Keyword of the wrong kind is a category error, not a working reference.
function requireKeyword(
  catalog: { keywords: Record<string, Keyword> },
  id: string,
  kinds: KeywordKind[],
  owner: string,
  field: string,
): void {
  const keyword = catalog.keywords[id]
  if (!keyword) {
    throw new Error(`${owner} references unknown keyword ${id} in ${field}`)
  }
  if (!kinds.includes(keyword.kind)) {
    throw new Error(`${owner} names ${id} in ${field}, but that Keyword is ${keyword.kind} and ${field} takes ${kinds.join(' or ')}`)
  }
}

function sourceAwareLabel<T extends { id: string }>(entries: ParsedEntry<T>[], label: string): (id: string) => string {
  const sources = new Map(entries.map((entry) => [entry.value.id, entry.source]))
  return (id) => {
    const source = sources.get(id)
    return source === undefined || source === '' ? `${label} ${id}` : `${label} ${id} (${source})`
  }
}

// Parses every payload and validates cross-references, taking over the job
// the frozen ContentValidator.gd did for .tres resources (ADR 0020).
// Which `target_type` values can supply each Counter host.
const HOST_TARGETS: Record<CounterDefinition['host'], string[]> = {
  combatant: ['none', 'piece'],
  hex: ['hex'],
  slot: ['board_slot'],
}

export function buildCatalog(raw: RawContent): ContentCatalog {
  const parsedCards = parseAll(raw.cards, cardSchema, 'card')
  const cardAt = sourceAwareLabel(parsedCards, 'Card')
  // Encounters are parsed to one side so their source files stay reachable
  // below: an Encounter carries the arena rules, so it is where a
  // cross-reference failure most needs to name the file.
  const parsedEncounters = parseAll(raw.encounters, encounterSchema, 'encounter')
  const encounterAt = sourceAwareLabel(parsedEncounters, 'Encounter')

  const catalog: ContentCatalog = {
    cards: indexById(parsedCards, 'card'),
    keywords: indexById(parseAll(raw.keywords, keywordSchema, 'keyword'), 'keyword'),
    chargeModifiers: indexById(parseAll(raw.chargeModifiers, chargeModifierSchema, 'charge modifier'), 'charge modifier'),
    hazards: indexById(parseAll(raw.hazards, hazardSchema, 'hazard'), 'hazard'),
    minions: indexById(parseAll(raw.minions, minionSchema, 'minion'), 'minion'),
    counters: indexById(parseAll(raw.counters ?? [], counterSchema, 'counter'), 'counter'),
    programs: indexById(parseAll(raw.programs, bossProgramSchema, 'boss program'), 'boss program'),
    encounters: indexById(parsedEncounters, 'encounter'),
    decks: indexById(parseAll(raw.decks ?? [], evaluationDeckSchema, 'deck'), 'deck'),
    scenarios: indexById(parseAll(raw.scenarios ?? [], scenarioSchema, 'scenario'), 'scenario'),
  }

  for (const card of Object.values(catalog.cards)) {
    if (card.burst_radius > 0 && card.damage < 1) {
      throw new Error(`${cardAt(card.id)} declares burst_radius ${card.burst_radius} but deals no damage`)
    }
    if (card.burst_radius > 0 && card.target_type !== 'hex') {
      throw new Error(`${cardAt(card.id)} declares burst_radius ${card.burst_radius} but does not target a hex`)
    }
    if (card.push_tiles > 0 && card.pull_tiles > 0) {
      throw new Error(`${cardAt(card.id)} declares both push_tiles and pull_tiles`)
    }
    const displacementField = card.push_tiles > 0 ? 'push_tiles' : card.pull_tiles > 0 ? 'pull_tiles' : ''
    if (displacementField !== '' && card.target_type !== 'piece') {
      throw new Error(`${cardAt(card.id)} declares ${displacementField} but does not target a piece`)
    }
    if (displacementField !== '' && card.range_tiles < 1) {
      throw new Error(`${cardAt(card.id)} declares ${displacementField} but has range_tiles below 1`)
    }
    for (const modifierId of card.charge_modifiers) {
      if (!catalog.chargeModifiers[modifierId]) {
        throw new Error(`Card ${card.id} references unknown charge modifier ${modifierId}`)
      }
    }
    for (const tag of card.tags) {
      requireKeyword(catalog, tag, KEYWORD_REFERENCES.cardTag, `Card ${card.id}`, 'tag')
    }
    for (const keywordId of card.damage_keywords) {
      requireKeyword(catalog, keywordId, KEYWORD_REFERENCES.damageKeywords, `Card ${card.id}`, 'damage_keywords')
    }
    if (card.damage_keywords.length > 0 && card.damage === 0 && card.boss_damage === 0) {
      throw new Error(`Card ${card.id} declares damage_keywords but deals no damage`)
    }
    if (card.places_counter !== '') {
      const counter = catalog.counters[card.places_counter]
      if (!counter) {
        throw new Error(`Card ${card.id} references unknown counter ${card.places_counter}`)
      }
      // `target_type` is the whole rule for where a Counter lands (D-033,
      // kept by D-047): `none` places on the firing Hero, `piece` on a
      // selected piece. D-034's `applies_to` cross-check is gone with the
      // field, and nothing is lost — "written for an Enemy" stopped being a
      // property of the Counter the moment its payload became Readers. A
      // Counter whose Reader fires on `host_takes_damage` does the same thing
      // to whoever holds it, and a card that Sunders its own Hero is a bad
      // card rather than an incoherent one.
      // A Counter's host and a card's target have to agree (D-048): only a hex
      // target can supply a hex, only a Slot target a Slot. Checked here so
      // resolution never has to ask what to do with a card that targets
      // nothing and places ground.
      if (!HOST_TARGETS[counter.host].includes(card.target_type)) {
        throw new Error(
          `Card ${card.id} places ${counter.id}, a ${counter.host} Counter, but targets ${card.target_type}; that host needs ${HOST_TARGETS[counter.host].join(' or ')}`,
        )
      }
      if (card.counter_amount > counter.max) {
        throw new Error(`Card ${card.id} places ${card.counter_amount} ${counter.id} but that Counter caps at ${counter.max}`)
      }
    }
    for (const reader of card.reads) {
      const named = [reader.counter, reader.counter_keyword].filter((value) => value !== '')
      if (named.length !== 1) {
        throw new Error(`Card ${card.id} has a ${reader.verb} reader naming ${named.length} of counter/counter_keyword; it must name exactly one`)
      }
      if (reader.counter !== '' && !catalog.counters[reader.counter]) {
        throw new Error(`Card ${card.id} reads unknown counter ${reader.counter}`)
      }
      if (reader.counter_keyword !== '') {
        requireKeyword(catalog, reader.counter_keyword, KEYWORD_REFERENCES.counterKeyword, `Card ${card.id}`, 'counter_keyword')
      }
      // A verb with none of its own numbers set is a reader that does nothing,
      // which is the failure this whole vocabulary exists to make loud.
      if (reader.verb === 'gate' && reader.at_least < 1) {
        throw new Error(`Card ${card.id} has a gate reader with no at_least`)
      }
      if (reader.verb === 'scale' && reader.per === 0) {
        throw new Error(`Card ${card.id} has a scale reader with no per`)
      }
      if (reader.verb === 'spend' && reader.amount < 1) {
        throw new Error(`Card ${card.id} has a spend reader with no amount`)
      }
      // A spend has to name one Counter. "Remove 3 of any fire Counter" would
      // make the rules pick which, and a rule that picks for the player is a
      // rule the player cannot plan against.
      if (reader.verb === 'spend' && reader.counter === '') {
        throw new Error(`Card ${card.id} spends by keyword; a spend must name one counter`)
      }
      if (reader.on === 'target' && card.target_type === 'none') {
        throw new Error(`Card ${card.id} has a ${reader.verb} reader on the target but chooses no target`)
      }
    }
    // The Signature contract (D-057, ADR 0032). A fixed card is a Hero's
    // engine: its standing clause is its only Charge source, so a fixed card
    // without one is a Slot that can never fire; and its Charges are tokens
    // with no Keywords, so a keyword-matching Charge Modifier on it would
    // author a bonus that can never match.
    if (card.fixed && card.standing.length === 0) {
      throw new Error(`${cardAt(card.id)} is fixed but authors no standing clause, so its Slot could never gain a Charge`)
    }
    if (!card.fixed && card.standing.length > 0) {
      throw new Error(`${cardAt(card.id)} authors a standing clause but is not fixed; only a Signature carries one`)
    }
    if (!card.fixed && card.full_charge.places_counter !== '') {
      throw new Error(`${cardAt(card.id)} authors a full_charge block but is not fixed; only a Signature carries one`)
    }
    if (card.fixed) {
      for (const modifierId of card.charge_modifiers) {
        if (catalog.chargeModifiers[modifierId]?.keyword_id !== '') {
          throw new Error(
            `${cardAt(card.id)} is fixed but its charge modifier ${modifierId} matches by Keyword; earned Charges are tokens and carry none`,
          )
        }
      }
      // The Hero Frame's Signature control fires with a tap and carries no
      // targeting flow (D-058): a targeted Signature is refused at load until
      // a Hero actually needs one, so the gap is loud rather than latent.
      if (card.target_type !== 'none') {
        throw new Error(
          `${cardAt(card.id)} is fixed but targets ${card.target_type}; the Signature control supports untargeted activations only (D-058)`,
        )
      }
    }
    if (!card.fixed && card.resource_title !== '') {
      throw new Error(`${cardAt(card.id)} authors a resource_title but is not fixed; only a Signature names a resource`)
    }
    for (const grant of card.standing) {
      // The mirror of READABLE_READER_PAIRS' discipline: a Grant `when` the
      // rules do not evaluate is a load error, never a clause that silently
      // does nothing.
      if (!(EVALUATED_GRANT_WHENS as readonly string[]).includes(grant.when)) {
        throw new Error(
          `${cardAt(card.id)} authors a ${grant.when} standing clause, which nothing evaluates; the evaluated whens are ${EVALUATED_GRANT_WHENS.join(', ')}`,
        )
      }
      if (grant.event_keyword !== '') {
        requireKeyword(catalog, grant.event_keyword, KEYWORD_REFERENCES.damageKeywords, `Card ${card.id}`, 'standing event_keyword')
      }
    }
    if (card.full_charge.places_counter !== '') {
      const riderCounter = catalog.counters[card.full_charge.places_counter]
      if (!riderCounter) {
        throw new Error(`${cardAt(card.id)} full_charge references unknown counter ${card.full_charge.places_counter}`)
      }
      // The rider follows the card's Boss damage, so it marks a combatant by
      // construction — a hex or slot Counter here has nowhere to land.
      if (riderCounter.host !== 'combatant') {
        throw new Error(`${cardAt(card.id)} full_charge places ${riderCounter.id}, which is hosted on a ${riderCounter.host}; the rider marks the Boss`)
      }
      if (card.boss_damage === 0) {
        throw new Error(`${cardAt(card.id)} authors a full_charge rider but deals no Boss damage for it to follow`)
      }
    }
  }
  for (const counter of Object.values(catalog.counters)) {
    for (const keywordId of counter.keywords) {
      requireKeyword(catalog, keywordId, KEYWORD_REFERENCES.counterKeyword, `Counter ${counter.id}`, 'keywords')
    }
    for (const reader of counter.readers) {
      if (!READABLE_READER_PAIRS.some((pair) => pair.when === reader.when && pair.effect === reader.effect)) {
        throw new Error(
          `Counter ${counter.id} authors a ${reader.when}/${reader.effect} reader, which nothing reads; the readable pairs are ${READABLE_READER_PAIRS.map((pair) => `${pair.when}/${pair.effect}`).join(', ')}`,
        )
      }
      if (reader.per === 0) {
        throw new Error(`Counter ${counter.id} has a ${reader.when} reader with per 0, which does nothing`)
      }
      if (reader.event_keyword !== '') {
        // Only a damage event carries Keywords. A Round starting and a Slot
        // firing are not made of anything, so narrowing them by Keyword would
        // author a Reader that can never fire.
        if (reader.when !== 'host_takes_damage' && reader.when !== 'host_deals_damage') {
          throw new Error(`Counter ${counter.id} narrows a ${reader.when} reader by event_keyword, but only damage events carry Keywords`)
        }
        requireKeyword(catalog, reader.event_keyword, KEYWORD_REFERENCES.damageKeywords, `Counter ${counter.id}`, 'event_keyword')
      }
    }
    // Every `when` in the Reader vocabulary names something that happens to a
    // combatant — a Round's Armor grant, taking or dealing damage, firing a
    // Slot. Ground and prepared cards do none of those, so a Counter hosted
    // there is a pure marker: it is read by cards, and authoring a Reader on
    // it would be authoring an effect that can never fire.
    if (counter.host !== 'combatant' && counter.readers.length > 0) {
      throw new Error(`Counter ${counter.id} is hosted on a ${counter.host} but declares readers, and every reader event is a combatant's`)
    }
    // The reachability half that can be enforced today: a Counter nothing
    // reads is an unreachable mechanic. The other half — a Counter nothing
    // places — is deliberately not an error yet, because Sundered and
    // Weakened are exactly that and are waiting on the deck-evaluation gate
    // for their first card (backlog item 10). Enforcing it now would delete
    // authored content to satisfy a lint.
    const readByCard = Object.values(catalog.cards).some((card) =>
      card.reads.some((reader) => reader.counter === counter.id || (reader.counter_keyword !== '' && counter.keywords.includes(reader.counter_keyword))),
    )
    if (counter.readers.length === 0 && !readByCard && !ENGINE_COUNTERS.includes(counter.id)) {
      throw new Error(`Counter ${counter.id} has no readers and no card reads it, so nothing can ever make it matter`)
    }
  }
  for (const modifier of Object.values(catalog.chargeModifiers)) {
    if (modifier.keyword_id !== '') {
      requireKeyword(catalog, modifier.keyword_id, KEYWORD_REFERENCES.chargeModifierMatch, `Charge modifier ${modifier.id}`, 'keyword_id')
    }
  }
  for (const program of Object.values(catalog.programs)) {
    for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
      if (beat.hazard && !catalog.hazards[beat.hazard]) {
        throw new Error(`Boss Beat ${beat.id} references unknown hazard ${beat.hazard}`)
      }
      if (beat.minion && !catalog.minions[beat.minion]) {
        throw new Error(`Boss Beat ${beat.id} references unknown minion ${beat.minion}`)
      }
      // The three Beat fields that were free text until now. All three are
      // joins into the Keyword namespace, and `damage_keywords` is the
      // one that mattered: the Signature's standing clause narrows on
      // `tank_hit` (D-057), so an unchecked typo here disabled the Grant
      // silently, at load, with every test still green.
      for (const keywordId of beat.damage_keywords) {
        requireKeyword(catalog, keywordId, KEYWORD_REFERENCES.damageKeywords, `Boss Beat ${beat.id}`, 'damage_keywords')
      }
      if (beat.target_selector !== '') {
        requireKeyword(catalog, beat.target_selector, KEYWORD_REFERENCES.targetSelector, `Boss Beat ${beat.id}`, 'target_selector')
      }
      for (const tag of beat.answer_tags) {
        requireKeyword(catalog, tag, KEYWORD_REFERENCES.answerTag, `Boss Beat ${beat.id}`, 'answer_tags')
      }
      // Reach is authored, and a Beat kind that asks a distance question has to
      // answer it. Left to the schema default a cone would collapse to nothing
      // and a proximity demand would be unanswerable from any hex — both silent
      // failures, both content-shaped, and neither one a type error.
      // A Beat kind that exists to place a Counter has to name one, and a
      // Beat that names one without being that kind is authoring an effect
      // nothing will run (D-051).
      if (beat.kind === 'place_counter' && beat.counter === '') {
        throw new Error(`Boss Beat ${beat.id} is a place_counter but names no counter`)
      }
      if (beat.kind !== 'place_counter' && beat.counter !== '') {
        throw new Error(`Boss Beat ${beat.id} names counter ${beat.counter} but is a ${beat.kind}, which never places one`)
      }
      if (beat.counter !== '' && !catalog.counters[beat.counter]) {
        throw new Error(`Boss Beat ${beat.id} references unknown counter ${beat.counter}`)
      }
      if (beat.counter !== '' && catalog.counters[beat.counter]?.host !== 'combatant') {
        throw new Error(`Boss Beat ${beat.id} places ${beat.counter}, which is hosted on a ${catalog.counters[beat.counter]?.host}; a Beat marks combatants`)
      }
      if (RANGED_BEAT_KINDS.has(beat.kind) && beat.range_tiles < 1) {
        throw new Error(`Boss Beat ${beat.id} is a ${beat.kind} but authors no range_tiles`)
      }
      // The other half of the same rule. `targeted_hit` is the hit footwork
      // cannot answer (D-017); giving it a reach would quietly turn Raking Claw
      // into something a camping Hero can stand outside of.
      if (!RANGED_BEAT_KINDS.has(beat.kind) && beat.range_tiles > 0) {
        throw new Error(`Boss Beat ${beat.id} is a ${beat.kind} and must not author range_tiles`)
      }
    }
  }
  // A Keyword the engine names by id has to be there, and be the right kind.
  // Content can rename a Keyword's wording freely; it cannot rename one out
  // from under the rules that compare against it.
  for (const required of ENGINE_KEYWORDS) {
    const keyword = catalog.keywords[required.id]
    if (!keyword) {
      throw new Error(`The rules name Keyword ${required.id}, which is not authored in data/keywords/`)
    }
    if (keyword.kind !== required.kind) {
      throw new Error(`The rules name Keyword ${required.id} as ${required.kind}, but it is authored as ${keyword.kind}`)
    }
  }
  // Only a Hero-referenced card may be fixed (D-057): a Signature is printed
  // on a Hero, and the Encounter's `signature_card` is where a Hero names it
  // while Heroes live inline on Encounters. Checked in both directions —
  // an Encounter naming a non-fixed card, and a fixed card no Encounter
  // names, are both authoring errors.
  const referencedSignatures = new Set<string>()
  for (const encounter of Object.values(catalog.encounters)) {
    if (encounter.signature_card === '') {
      continue
    }
    const signature = catalog.cards[encounter.signature_card]
    if (!signature) {
      throw new Error(`${encounterAt(encounter.id)} references unknown signature card ${encounter.signature_card}`)
    }
    if (!signature.fixed) {
      throw new Error(`${encounterAt(encounter.id)} names ${signature.id} as its signature card, but that card is not fixed`)
    }
    referencedSignatures.add(signature.id)
  }
  for (const card of Object.values(catalog.cards)) {
    if (card.fixed && !referencedSignatures.has(card.id)) {
      throw new Error(`${cardAt(card.id)} is fixed but no Encounter names it as a signature card, so no Hero carries it`)
    }
  }
  for (const encounter of Object.values(catalog.encounters)) {
    for (const entry of encounter.player_deck) {
      if (!catalog.cards[entry.card]) {
        throw new Error(`${encounterAt(encounter.id)} deck references unknown card ${entry.card}`)
      }
      // A fixed card is never in the deck — it is never drawn and never
      // discarded, and a deck copy would be exactly the hand-charging route
      // D-057 closes.
      if (catalog.cards[entry.card].fixed) {
        throw new Error(`${encounterAt(encounter.id)} deck lists ${entry.card}, which is fixed; a Signature is never in the deck`)
      }
    }
    for (const programId of encounter.boss_programs) {
      if (!catalog.programs[programId]) {
        throw new Error(`${encounterAt(encounter.id)} references unknown Boss Program ${programId}`)
      }
    }
    for (const programId of encounter.phase_two_programs) {
      if (!catalog.programs[programId]) {
        throw new Error(`${encounterAt(encounter.id)} references unknown Phase II Boss Program ${programId}`)
      }
    }
    // The Guarded Front has to stay standable (D-031). A Scorched hex beside
    // the Boss burns the one tile the Tank's whole kit is written for, so
    // Escalation would remove the party's answer rather than raise the
    // question — the acceleration lesson in another form. Held for every
    // Encounter, because a new arena is exactly where the rule is easiest to
    // author past by accident.
    for (const threshold of encounter.escalation_thresholds) {
      for (const coords of threshold.scorch_hexes) {
        if (hexDistance(coords, encounter.boss_start) <= 1) {
          throw new Error(
            `${encounterAt(encounter.id)} threshold ${threshold.value} ("${threshold.title}") Scorches (${coords.q}, ${coords.r}), which is adjacent to the Boss at (${encounter.boss_start.q}, ${encounter.boss_start.r}) — the Guarded Front must stay standable`,
          )
        }
      }
    }
  }
  for (const deck of Object.values(catalog.decks)) {
    if (!catalog.encounters[deck.encounter]) {
      throw new Error(`Deck ${deck.id} references unknown encounter ${deck.encounter}`)
    }
    for (const entry of deck.player_deck) {
      if (!catalog.cards[entry.card]) {
        throw new Error(`Deck ${deck.id} references unknown card ${entry.card}`)
      }
    }
  }
  for (const scenario of Object.values(catalog.scenarios)) {
    if (!catalog.encounters[scenario.encounter]) {
      throw new Error(`Scenario ${scenario.id} references unknown encounter ${scenario.encounter}`)
    }
  }
  return catalog
}

// Every authored definition that can change one selected Encounter's rules.
// The Content Catalog owns this traversal because it already owns the
// cross-reference graph. Consumers decide what to do with the result: an
// Encounter Record sorts and hashes it, while evaluation decks and Scenarios
// stay outside because neither changes the Encounter reached at runtime.
export function reachableEncounterContent(catalog: ContentCatalog, encounterId: string): Map<string, unknown> {
  const encounter = catalog.encounters[encounterId]
  if (!encounter) {
    throw new Error(`Unknown encounter: ${encounterId}`)
  }

  const reachable = new Map<string, unknown>()
  const requireDefinition = <T>(kind: string, id: string, definitions: Record<string, T>): T => {
    const definition = definitions[id]
    if (!definition) {
      throw new Error(`Encounter ${encounterId} reaches unknown ${kind} ${id}`)
    }
    reachable.set(`${kind}:${id}`, definition)
    return definition
  }
  const addKeyword = (id: string): void => {
    requireDefinition('keyword', id, catalog.keywords)
  }
  const visitedCards = new Set<string>()
  const addCard = (id: string): void => {
    const card = requireDefinition('card', id, catalog.cards)
    if (visitedCards.has(id)) {
      return
    }
    visitedCards.add(id)
    card.tags.forEach(addKeyword)
    for (const modifierId of card.charge_modifiers) {
      const modifier = requireDefinition('charge_modifier', modifierId, catalog.chargeModifiers)
      if (modifier.keyword_id !== '') {
        addKeyword(modifier.keyword_id)
      }
    }
    if (card.places_counter !== '') {
      requireDefinition('counter', card.places_counter, catalog.counters)
    }
    if (card.full_charge.places_counter !== '') {
      requireDefinition('counter', card.full_charge.places_counter, catalog.counters)
    }
    for (const grant of card.standing) {
      if (grant.event_keyword !== '') {
        addKeyword(grant.event_keyword)
      }
    }
  }
  const visitedPrograms = new Set<string>()
  const addProgram = (id: string): void => {
    const program = requireDefinition('boss_program', id, catalog.programs)
    if (visitedPrograms.has(id)) {
      return
    }
    visitedPrograms.add(id)
    for (const beat of [...program.instant_beats, ...program.incoming_beats]) {
      if (beat.hazard) {
        requireDefinition('hazard', beat.hazard, catalog.hazards)
      }
      if (beat.minion) {
        requireDefinition('minion', beat.minion, catalog.minions)
      }
      // A Beat's Keywords are reachable content like anything else it names:
      // the answer the Forecast Row promises and the kind of blow the Beat
      // lands are both things a player reads, so retitling one starts a new
      // evidence cohort the same way retitling a Hazard does.
      beat.damage_keywords.forEach(addKeyword)
      if (beat.target_selector) {
        addKeyword(beat.target_selector)
      }
      beat.answer_tags.forEach(addKeyword)
    }
  }

  reachable.set(`encounter:${encounterId}`, encounter)
  encounter.player_deck.forEach((entry) => addCard(entry.card))
  // The Signature is reachable content like any deck card (D-057): it changes
  // the Encounter's rules, so retuning it starts a new evidence cohort.
  if (encounter.signature_card !== '') {
    addCard(encounter.signature_card)
  }
  for (const programId of [...encounter.boss_programs, ...encounter.phase_two_programs]) {
    addProgram(programId)
  }
  return reachable
}

// Whether firing this card needs a chosen piece — because it puts a Counter
// on one, or reads Counters there. One predicate, because legality and the
// targeting projection the board draws from have to agree about which pieces
// are offerable; two copies of it is how they come to disagree.
export function cardNeedsPieceTarget(card: Card): boolean {
  return card.target_type === 'piece' && (card.places_counter !== '' || card.reads.some((reader) => reader.on === 'target'))
}

// The Top Card alone determines activation timing; legacy "fast" reads as quick.
export function cardWindowSpeed(card: Card): 'quick' | 'slow' {
  if (card.speed === 'fast') {
    return 'quick'
  }
  return card.speed
}

// Charge Value: an explicit max_charge wins; otherwise slow cards hold 3, quick 2.
export function cardChargeCap(card: Card): number {
  if (card.max_charge > 0) {
    return card.max_charge
  }
  return cardWindowSpeed(card) === 'slow' ? 3 : 2
}

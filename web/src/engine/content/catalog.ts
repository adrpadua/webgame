import {
  bossProgramSchema,
  cardSchema,
  chargeModifierSchema,
  encounterSchema,
  evaluationDeckSchema,
  hazardSchema,
  bossSchema,
  heroSchema,
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
  type Boss,
  type Hero,
  type Keyword,
  type Minion,
  type Scenario,
  type CounterDefinition,
} from './schemas'
import { ENGINE_KEYWORDS, KEYWORD_REFERENCES, type KeywordKind } from '../keywords'
import { ENGINE_COUNTERS, READABLE_READER_PAIRS } from '../counters'
import { EVALUATED_GRANT_WHENS, GATES_BY_WHEN } from '../signature'
import { hexDistance } from '../hex'

// The Beat kinds that always ask a distance question, and therefore must always
// author one. Kept here rather than beside the resolver because it is a rule
// about content being complete, not about how a Beat resolves.
//
// Typed against the Beat-kind enum rather than left as loose strings. This file
// is the one that renamed every Beat kind once already, and a stale entry here
// would not fail — it would simply stop matching, and the validation below
// would go quiet on the rule it exists to enforce. The annotation turns that
// into a compile error at the moment of the rename.
const RANGED_BEAT_KINDS = new Set<BossBeat['kind']>(['forward_cone', 'demand_proximity', 'targeted_hit'])

// Why *this* Beat needs a reach, named rather than counted so the authoring
// error can say which clause asked for one — the same shape `cardReachingEffects`
// takes on the card side (D-073).
//
// The list is longer than `RANGED_BEAT_KINDS` because two of the three reasons
// are fields rather than kinds. A `place_counter` reaches only when it is aimed
// at a Hero, and *any* kind reaches once it carries a movement clause, because
// `range_tiles` is what tells the movement how close is close enough. A kind
// list could not express either.
function beatReachReasons(beat: BossBeat): string[] {
  const reasons: string[] = []
  if (RANGED_BEAT_KINDS.has(beat.kind)) {
    reasons.push(`a ${beat.kind}`)
  }
  if (beat.kind === 'place_counter' && beat.counter_target === 'hero') {
    reasons.push('marking a Hero')
  }
  if (beatMoves(beat)) {
    reasons.push(`a ${beat.traversal} clause, which needs to know how close to get`)
  }
  return reasons
}

// A Beat carries a movement clause when it has an allowance to spend, or when
// it teleports — which spends nothing and is therefore the one movement a
// distance of zero does not rule out.
function beatMoves(beat: BossBeat): boolean {
  return beat.move_tiles > 0 || beat.traversal === 'teleport' || beat.kind === 'advance_toward_player'
}

// What a Card touches that is not the Hero firing it, named rather than
// counted so the authoring error can say which field asked for a reach. Every
// one of these is measured from the Hero's hex at fire time, so every one of
// them needs `range_tiles` to say how far that measurement may stretch.
//
// `boss_damage` is in this list and used not to be. It resolved without a
// range check under the positionless ruling behind D-017, which meant reach
// was a property some abilities had and others silently did without.
function cardReachingEffects(card: Card): string[] {
  const reaching: string[] = []
  if (card.boss_damage > 0) {
    reaching.push('boss_damage')
  }
  if (card.damage > 0) {
    reaching.push('damage')
  }
  if (card.push_tiles > 0) {
    reaching.push('push_tiles')
  }
  if (card.pull_tiles > 0) {
    reaching.push('pull_tiles')
  }
  if (card.target_type === 'hex' || card.target_type === 'piece' || card.target_type === 'ally') {
    reaching.push(`target_type ${card.target_type}`)
  }
  return reaching
}

export interface ContentCatalog {
  cards: Record<string, Card>
  heroes: Record<string, Hero>
  bosses: Record<string, Boss>
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
  heroes?: unknown[]
  bosses?: unknown[]
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
  // An `ally` target is a combatant like any other, which is what lets a
  // Healer card place a Counter on the party member it preserves — the ward
  // shape the healer research note calls the Bond.
  combatant: ['none', 'piece', 'ally'],
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
  const parsedHeroes = parseAll(raw.heroes ?? [], heroSchema, 'hero')
  const parsedBosses = parseAll(raw.bosses ?? [], bossSchema, 'boss')
  const heroAt = sourceAwareLabel(parsedHeroes, 'Hero')

  const catalog: ContentCatalog = {
    cards: indexById(parsedCards, 'card'),
    heroes: indexById(parsedHeroes, 'hero'),
    bosses: indexById(parsedBosses, 'boss'),
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
    // A Burst spreads whichever effect the card carries: damage over the
    // Enemies inside it, or healing over the party Heroes inside it (D-080,
    // the paper Radial pattern). A Burst carrying neither covers nothing.
    if (card.burst_radius > 0 && card.damage < 1 && card.healing < 1) {
      throw new Error(`${cardAt(card.id)} declares burst_radius ${card.burst_radius} but deals no damage and heals nothing`)
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
    // Both halves of the reach rule, the same pair the ranged Beat kinds
    // answer below (D-043, extended to cards by D-073): a card that touches
    // anything past its own Hero authors how far it touches, and a card that
    // touches nobody must not author a reach nothing reads.
    //
    // `board_slot` is deliberately outside the reaching set: an ally's prepared
    // Slot is not a place on the board, and support was chosen adjacency-free
    // (D-009). An `ally` *is* in it, because ADR 0035 chose the other answer
    // for the Hero themselves — a card reaches an ally at an authored distance,
    // and `legality` enforces it — so the two halves of D-009's ruling came
    // apart: the Slot stays adjacency-free, the body does not.
    const reaching = cardReachingEffects(card)
    if (reaching.length > 0 && card.range_tiles < 1) {
      throw new Error(`${cardAt(card.id)} reaches past its Hero (${reaching.join(', ')}) but authors no range_tiles`)
    }
    if (reaching.length === 0 && card.range_tiles > 0) {
      throw new Error(`${cardAt(card.id)} authors range_tiles ${card.range_tiles} but reaches nothing past its own Hero`)
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
    // The Signature contract (D-064, ADR 0032). A fixed card is a Hero's
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
      // The Signature control fires with a tap (D-065) or, since Maren's
      // Underwriting (D-080), through the same targeting flow every Slot
      // uses: `ally` targeting resolves by tapping the ally's hex, and
      // `fireTargeting` projects the legal set. Hex and piece targeting on a
      // fixed card still have no consumer, so they stay refused at load —
      // the gap loud rather than latent, exactly as D-065 wanted.
      if (card.target_type !== 'none' && card.target_type !== 'ally') {
        throw new Error(
          `${cardAt(card.id)} is fixed but targets ${card.target_type}; a Signature activates untargeted or at an ally (D-065, D-080)`,
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
      // Which gates the event can answer (ADR 0037). A gate is a question
      // about a moment, and three of the four moments are not blows: asking
      // whether a Round start lost zero health is incoherent rather than
      // merely false. Refused here rather than allowed to load and quietly
      // never pass — the same trap the `when` check above closes.
      const allowedGates = GATES_BY_WHEN[grant.when as keyof typeof GATES_BY_WHEN] ?? []
      for (const gate of grant.gates) {
        if (!allowedGates.includes(gate)) {
          throw new Error(
            `${cardAt(card.id)} gates a ${grant.when} standing clause on ${gate}, which that event cannot answer; ${grant.when} takes ${allowedGates.length > 0 ? allowedGates.join(' or ') : 'no gates'}`,
          )
        }
      }
      // An event_keyword narrows a *blow*. On an event that is not one there
      // is no Keyword to match, so the clause would never fire.
      if (grant.event_keyword !== '' && grant.when !== 'host_takes_damage' && grant.when !== 'host_deals_damage') {
        throw new Error(`${cardAt(card.id)} narrows a ${grant.when} standing clause by event_keyword, but that event carries no damage Keywords`)
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
      // An enemy-facing rider follows the card's Boss damage (the Riposte's
      // Sundered); a preservation Signature's rider follows its ally cover
      // instead, landing on the firing Hero (D-080). A card with neither has
      // nothing for the rider to ride.
      if (card.boss_damage === 0 && card.target_type !== 'ally') {
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
  for (const minion of Object.values(catalog.minions)) {
    // A fuse is two authored halves and neither is usable alone (D-063):
    // damage with no radius is a blast that reaches nothing, and a radius with
    // no damage is a Minion that removes itself for free. Stated both ways so
    // a half-authored fuse fails at load rather than resolving to nothing.
    if (minion.explode_damage > 0 && minion.explode_radius < 1) {
      throw new Error(`Minion ${minion.id} declares explode_damage ${minion.explode_damage} but no explode_radius`)
    }
    if (minion.explode_radius > 0 && minion.explode_damage < 1) {
      throw new Error(`Minion ${minion.id} declares explode_radius ${minion.explode_radius} but no explode_damage`)
    }
    // A Minion states its reach for the same reason a Card and a Beat do
    // (D-073, D-074, extended here by D-072): a bite whose distance lives in
    // engine code is a bite an author cannot tune. Both halves again — a
    // Minion that bites says how far, and one that never bites must not carry
    // a number nothing reads.
    if (minion.attack_damage > 0 && minion.range_tiles < 1) {
      throw new Error(`Minion ${minion.id} bites for ${minion.attack_damage} but authors no range_tiles`)
    }
    if (minion.attack_damage === 0 && minion.range_tiles > 0) {
      throw new Error(`Minion ${minion.id} authors range_tiles ${minion.range_tiles} but has no attack to reach with`)
    }
    // The creep only runs for a Minion that has something to close for, so an
    // allowance on one that never bites is movement nothing asks for.
    if (minion.attack_damage === 0 && minion.move_tiles > 0) {
      throw new Error(`Minion ${minion.id} authors move_tiles ${minion.move_tiles} but has no attack to close for`)
    }
    // The same two traversal rules Beats answer: a teleport spends no
    // allowance, and a jump is an allowance spent differently.
    if (minion.traversal === 'teleport' && minion.move_tiles > 0) {
      throw new Error(`Minion ${minion.id} teleports but authors move_tiles ${minion.move_tiles}; a teleport spends no allowance — author a jump instead`)
    }
    if (minion.traversal === 'jump' && minion.move_tiles < 1) {
      throw new Error(`Minion ${minion.id} authors traversal jump but no move_tiles to spend on it`)
    }
  }
  for (const modifier of Object.values(catalog.chargeModifiers)) {
    if (modifier.keyword_id !== '') {
      requireKeyword(catalog, modifier.keyword_id, KEYWORD_REFERENCES.chargeModifierMatch, `Charge modifier ${modifier.id}`, 'keyword_id')
    }
  }
  for (const program of Object.values(catalog.programs)) {
    // A Movement Clause belongs to the Instant Row alone (D-075). The Incoming
    // Row is telegraphed a phase before it resolves, and where a moving Beat
    // ends up is not knowable then — the Hero moves in between — so the painted
    // cone becomes a promise the player breaks by playing correctly. ADR 0031
    // removed the Forecast Row over exactly that: disclosure nobody can rely on
    // teaches nothing. The Instant Row resolves immediately and promises
    // nothing, which is why movement lives there.
    //
    // The honest form of a moving telegraphed Beat is to move the piece at
    // *telegraph* time, so the cone is drawn from where the Boss will actually
    // stand. That is a real design and it should arrive with the Boss that
    // needs it, rather than being left available and quietly wrong.
    for (const beat of program.incoming_beats) {
      if (beatMoves(beat)) {
        throw new Error(
          `Boss Beat ${beat.id} carries a movement clause on the Incoming Row of ${program.id}; the telegraph is painted before it resolves, so where it ends up cannot be shown — author it on the Instant Row, or move the piece at telegraph time`,
        )
      }
    }
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
      // `tank_hit` (D-064), so an unchecked typo here disabled the Grant
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
      const reachReasons = beatReachReasons(beat)
      if (reachReasons.length > 0 && beat.range_tiles < 1) {
        throw new Error(`Boss Beat ${beat.id} is ${reachReasons.join(' and ')} but authors no range_tiles`)
      }
      // The other half of the same rule: a Beat with no distance question to
      // ask must not answer one, because a reach nothing reads is a number an
      // author can set and watch do nothing.
      if (reachReasons.length === 0 && beat.range_tiles > 0) {
        throw new Error(`Boss Beat ${beat.id} is a ${beat.kind} and must not author range_tiles`)
      }
      // A movement kind with nothing to spend goes nowhere, and an allowance on
      // a teleport is a number it never consults — a teleport has no route to
      // spend it on, which is the whole difference between it and a jump
      // (D-074).
      if (beat.kind === 'advance_toward_player' && beat.traversal !== 'teleport' && beat.move_tiles < 1) {
        throw new Error(`Boss Beat ${beat.id} is an advance_toward_player but authors no move_tiles`)
      }
      if (beat.traversal === 'teleport' && beat.move_tiles > 0) {
        throw new Error(`Boss Beat ${beat.id} teleports but authors move_tiles ${beat.move_tiles}; a teleport spends no allowance — author a jump instead`)
      }
      // A Beat that does not move must not say how. `walk` is the schema
      // default, so only an authored `jump` or `teleport` can trip this.
      if (!beatMoves(beat) && beat.traversal !== 'walk') {
        throw new Error(`Boss Beat ${beat.id} authors traversal ${beat.traversal} but carries no movement clause`)
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
  // Only a Hero-named card may be fixed (D-064): a Signature is printed on a
  // Hero, and the Hero definition in data/heroes/ is where it is printed
  // (ADR 0034). Checked in both directions — a Hero naming a non-fixed card,
  // and a fixed card no Hero names, are both authoring errors.
  const referencedSignatures = new Set<string>()
  for (const hero of Object.values(catalog.heroes)) {
    if (hero.signature_card === '') {
      continue
    }
    const signature = catalog.cards[hero.signature_card]
    if (!signature) {
      throw new Error(`${heroAt(hero.id)} references unknown signature card ${hero.signature_card}`)
    }
    if (!signature.fixed) {
      throw new Error(`${heroAt(hero.id)} names ${signature.id} as their signature card, but that card is not fixed`)
    }
    referencedSignatures.add(signature.id)
  }
  for (const card of Object.values(catalog.cards)) {
    if (card.fixed && !referencedSignatures.has(card.id)) {
      throw new Error(`${cardAt(card.id)} is fixed but no Hero names it as their signature card, so nothing carries it`)
    }
  }
  for (const encounter of Object.values(catalog.encounters)) {
    // Every Hero the Party fields has to exist before the fight can start,
    // and the error names the Encounter file because that is the one being
    // edited when the reference breaks.
    if (!catalog.bosses[encounter.boss]) {
      throw new Error(`${encounterAt(encounter.id)} references unknown boss ${encounter.boss}`)
    }
    const seated = new Set<string>()
    for (const seat of encounter.party) {
      if (!catalog.heroes[seat.hero]) {
        throw new Error(`${encounterAt(encounter.id)} references unknown hero ${seat.hero}`)
      }
      // One Hero cannot hold two seats: the Party is keyed by Hero id
      // everywhere downstream — board entities, Counter hosts, Slot refs —
      // so a duplicate would be two seats quietly sharing one health pool.
      if (seated.has(seat.hero)) {
        throw new Error(`${encounterAt(encounter.id)} seats ${seat.hero} twice; one Hero holds one seat`)
      }
      seated.add(seat.hero)
      for (const entry of seat.deck) {
        if (!catalog.cards[entry.card]) {
          throw new Error(`${encounterAt(encounter.id)} seat ${seat.hero} references unknown card ${entry.card}`)
        }
        if (catalog.cards[entry.card].fixed) {
          throw new Error(`${encounterAt(encounter.id)} seat ${seat.hero} lists ${entry.card}, which is fixed; a Signature is never in the deck`)
        }
      }
    }
    // Two Heroes cannot open on the same hex. Occupancy is a board rule the
    // rest of the game enforces move by move; setup is the one place it could
    // be authored past.
    const starts = new Map<string, string>()
    for (const seat of encounter.party) {
      const key = `${seat.start.q},${seat.start.r}`
      const held = starts.get(key)
      if (held !== undefined) {
        throw new Error(
          `${encounterAt(encounter.id)} starts ${seat.hero} on (${seat.start.q}, ${seat.start.r}), where ${held} already stands`,
        )
      }
      starts.set(key, seat.hero)
    }
    for (const entry of encounter.player_deck) {
      if (!catalog.cards[entry.card]) {
        throw new Error(`${encounterAt(encounter.id)} deck references unknown card ${entry.card}`)
      }
      // A fixed card is never in the deck — it is never drawn and never
      // discarded, and a deck copy would be exactly the hand-charging route
      // D-064 closes.
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
    // The Round-end step prices one demand per kind, taking the dearest priced
    // Beat in the pool and asking *its* question (`escalation.ts`). That is
    // fine while every priced Beat of a kind asks the same question, and a
    // silent drop the moment two disagree: two priced `place_counter` Beats
    // naming different Counters would leave the cheaper Counter authored with a
    // price and never billed, and two `demand_proximity` Beats at different
    // reaches would bill the party at a distance one of them never asked
    // about. Neither shows up as a failure — it shows up as a demand that
    // quietly does nothing, which is exactly the shape this pass was written to
    // stop shipping. Refuse the content instead.
    const pooled = [...encounter.boss_programs, ...encounter.phase_two_programs]
      .flatMap((programId) => catalog.programs[programId] ?? [])
      .flatMap((program) => [...program.instant_beats, ...program.incoming_beats])
      .filter((beat) => beat.escalation_if_unanswered > 0)
    for (const kind of new Set(pooled.map((beat) => beat.kind))) {
      const sameKind = pooled.filter((beat) => beat.kind === kind)
      for (const field of ['counter', 'range_tiles'] as const) {
        const asked = new Set(sameKind.map((beat) => beat[field]))
        if (asked.size > 1) {
          throw new Error(
            `${encounterAt(encounter.id)} prices ${sameKind.length} ${kind} Beats (${sameKind.map((beat) => beat.id).join(', ')}) that disagree on ${field} (${[...asked].join(', ')}); the Round-end step prices one ${kind} demand, so all of them must ask the same question`,
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
  // Every seated Hero definition is reachable content (ADR 0034): their
  // health pool changes the Encounter's rules, so retuning a Hero starts a
  // new evidence cohort for every Encounter that fields them.
  for (const seat of encounter.party) {
    const hero = requireDefinition('hero', seat.hero, catalog.heroes)
    seat.deck.forEach((entry) => addCard(entry.card))
    // The Signature is reachable content like any deck card (D-064): it
    // changes the Encounter's rules, so retuning it starts a new evidence
    // cohort. Only when fielded — the teaching slice's fight is the same
    // fight whether or not the printed card exists.
    if (seat.fields_signature && hero.signature_card !== '') {
      addCard(hero.signature_card)
    }
  }
  encounter.player_deck.forEach((entry) => addCard(entry.card))
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

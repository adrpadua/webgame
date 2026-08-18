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
  statusSchema,
  type BossProgram,
  type Card,
  type ChargeModifier,
  type EncounterDefinition,
  type EvaluationDeck,
  type Hazard,
  type Keyword,
  type Minion,
  type Scenario,
  type StatusDefinition,
} from './schemas'
import { hexDistance } from '../hex'

// The Beat kinds that ask a distance question, and therefore must author one.
// Kept here rather than beside the resolver because it is a rule about content
// being complete, not about how a Beat resolves — and because the validation
// below has to be able to state both halves: these kinds need a reach, and
// every other kind must not have one.
const RANGED_BEAT_KINDS = new Set(['forward_cone', 'demand_proximity'])

export interface ContentCatalog {
  cards: Record<string, Card>
  keywords: Record<string, Keyword>
  chargeModifiers: Record<string, ChargeModifier>
  hazards: Record<string, Hazard>
  minions: Record<string, Minion>
  statuses: Record<string, StatusDefinition>
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
  statuses?: unknown[]
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

function sourceAwareLabel<T extends { id: string }>(entries: ParsedEntry<T>[], label: string): (id: string) => string {
  const sources = new Map(entries.map((entry) => [entry.value.id, entry.source]))
  return (id) => {
    const source = sources.get(id)
    return source === undefined || source === '' ? `${label} ${id}` : `${label} ${id} (${source})`
  }
}

// Parses every payload and validates cross-references, taking over the job
// the frozen ContentValidator.gd did for .tres resources (ADR 0020).
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
    statuses: indexById(parseAll(raw.statuses ?? [], statusSchema, 'status'), 'status'),
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
      if (!catalog.keywords[tag]) {
        throw new Error(`Card ${card.id} references unknown keyword ${tag}`)
      }
    }
    if (card.applies_status !== '') {
      const status = catalog.statuses[card.applies_status]
      if (!status) {
        throw new Error(`Card ${card.id} references unknown status ${card.applies_status}`)
      }
      // Targeting reuses the existing rule per kind (D-034), so the card's
      // declared target has to match the side the status is written for.
      const expected = status.applies_to === 'enemy' ? 'piece' : card.target_type
      if (status.applies_to === 'enemy' && card.target_type !== 'piece') {
        throw new Error(`Card ${card.id} applies the enemy status ${status.id} but does not target a piece`)
      }
      if (status.applies_to === 'hero' && card.target_type !== 'none' && card.target_type !== 'board_slot') {
        throw new Error(`Card ${card.id} applies the hero status ${status.id} but targets ${expected}`)
      }
    }
  }
  for (const modifier of Object.values(catalog.chargeModifiers)) {
    if (modifier.keyword_id !== '' && !catalog.keywords[modifier.keyword_id]) {
      throw new Error(`Charge modifier ${modifier.id} references unknown keyword ${modifier.keyword_id}`)
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
      // Reach is authored, and a Beat kind that asks a distance question has to
      // answer it. Left to the schema default a cone would collapse to nothing
      // and a proximity demand would be unanswerable from any hex — both silent
      // failures, both content-shaped, and neither one a type error.
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
  for (const encounter of Object.values(catalog.encounters)) {
    for (const entry of encounter.player_deck) {
      if (!catalog.cards[entry.card]) {
        throw new Error(`${encounterAt(encounter.id)} deck references unknown card ${entry.card}`)
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
    if (card.applies_status !== '') {
      requireDefinition('status', card.applies_status, catalog.statuses)
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
    }
  }

  reachable.set(`encounter:${encounterId}`, encounter)
  encounter.player_deck.forEach((entry) => addCard(entry.card))
  for (const programId of [...encounter.boss_programs, ...encounter.phase_two_programs]) {
    addProgram(programId)
  }
  return reachable
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

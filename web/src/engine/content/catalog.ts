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

// Parses every payload and validates cross-references, taking over the job
// the frozen ContentValidator.gd did for .tres resources (ADR 0020).
export function buildCatalog(raw: RawContent): ContentCatalog {
  const catalog: ContentCatalog = {
    cards: indexById(parseAll(raw.cards, cardSchema, 'card'), 'card'),
    keywords: indexById(parseAll(raw.keywords, keywordSchema, 'keyword'), 'keyword'),
    chargeModifiers: indexById(parseAll(raw.chargeModifiers, chargeModifierSchema, 'charge modifier'), 'charge modifier'),
    hazards: indexById(parseAll(raw.hazards, hazardSchema, 'hazard'), 'hazard'),
    minions: indexById(parseAll(raw.minions, minionSchema, 'minion'), 'minion'),
    statuses: indexById(parseAll(raw.statuses ?? [], statusSchema, 'status'), 'status'),
    programs: indexById(parseAll(raw.programs, bossProgramSchema, 'boss program'), 'boss program'),
    encounters: indexById(parseAll(raw.encounters, encounterSchema, 'encounter'), 'encounter'),
    decks: indexById(parseAll(raw.decks ?? [], evaluationDeckSchema, 'deck'), 'deck'),
    scenarios: indexById(parseAll(raw.scenarios ?? [], scenarioSchema, 'scenario'), 'scenario'),
  }

  for (const card of Object.values(catalog.cards)) {
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
    }
  }
  for (const encounter of Object.values(catalog.encounters)) {
    for (const entry of encounter.player_deck) {
      if (!catalog.cards[entry.card]) {
        throw new Error(`Encounter ${encounter.id} deck references unknown card ${entry.card}`)
      }
    }
    for (const programId of encounter.boss_programs) {
      if (!catalog.programs[programId]) {
        throw new Error(`Encounter ${encounter.id} references unknown Boss Program ${programId}`)
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

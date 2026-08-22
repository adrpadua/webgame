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
  type ContentCatalog,
} from './schemas'
import { validateCards, validateChargeModifiers } from './card'
import { validateCounters } from './counterDef'
import { validateMinions } from './minionDef'
import { validatePrograms } from './program'
import { validateSignatures } from './hero'
import { validateDecks, validateEncounters, validateScenarios } from './encounter'
import { ENGINE_KEYWORDS } from '../keywords'

// The Content Catalog: parse every authored payload, assemble the record
// maps, and run each concept's validation — taking over the job the frozen
// ContentValidator.gd did for .tres resources (ADR 0020). Since the concept
// split, what a Card (or Counter, Minion, Program, Hero, Encounter) *is* —
// its schema, its cross-field rules, its derived properties — lives in that
// concept's module under `content/`; this file owns the parsing plumbing,
// the composition, and the cross-reference traversal Records hash.

export type { ContentCatalog } from './schemas'

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


function sourceAwareLabel<T extends { id: string }>(entries: ParsedEntry<T>[], label: string): (id: string) => string {
  const sources = new Map(entries.map((entry) => [entry.value.id, entry.source]))
  return (id) => {
    const source = sources.get(id)
    return source === undefined || source === '' ? `${label} ${id}` : `${label} ${id} (${source})`
  }
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

  validateCards(catalog, cardAt)
  validateCounters(catalog)
  validateMinions(catalog)
  validateChargeModifiers(catalog)
  validatePrograms(catalog)
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
  }  validateSignatures(catalog, heroAt, cardAt)
  validateEncounters(catalog, encounterAt)
  validateDecks(catalog)
  validateScenarios(catalog)
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

// The Card's derived properties, re-exported from the concept module for
// every caller that has always imported them from the catalog.
export { cardChargeCap, cardNeedsPieceTarget, cardWindowSpeed } from './card'

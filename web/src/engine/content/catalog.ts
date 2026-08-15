import {
  bossProgramSchema,
  cardSchema,
  chargeModifierSchema,
  encounterSchema,
  hazardSchema,
  keywordSchema,
  minionSchema,
  type BossProgram,
  type Card,
  type ChargeModifier,
  type EncounterDefinition,
  type Hazard,
  type Keyword,
  type Minion,
} from './schemas'

export interface ContentCatalog {
  cards: Record<string, Card>
  keywords: Record<string, Keyword>
  chargeModifiers: Record<string, ChargeModifier>
  hazards: Record<string, Hazard>
  minions: Record<string, Minion>
  programs: Record<string, BossProgram>
  encounters: Record<string, EncounterDefinition>
}

export interface RawContent {
  cards: unknown[]
  keywords: unknown[]
  chargeModifiers: unknown[]
  hazards: unknown[]
  minions: unknown[]
  programs: unknown[]
  encounters: unknown[]
}

function indexById<T extends { id: string }>(entries: T[], label: string): Record<string, T> {
  const result: Record<string, T> = {}
  for (const entry of entries) {
    if (result[entry.id]) {
      throw new Error(`Duplicate ${label} id: ${entry.id}`)
    }
    result[entry.id] = entry
  }
  return result
}

// Parses every payload and validates cross-references, taking over the job
// the frozen ContentValidator.gd did for .tres resources (ADR 0020).
export function buildCatalog(raw: RawContent): ContentCatalog {
  const catalog: ContentCatalog = {
    cards: indexById(raw.cards.map((entry) => cardSchema.parse(entry)), 'card'),
    keywords: indexById(raw.keywords.map((entry) => keywordSchema.parse(entry)), 'keyword'),
    chargeModifiers: indexById(raw.chargeModifiers.map((entry) => chargeModifierSchema.parse(entry)), 'charge modifier'),
    hazards: indexById(raw.hazards.map((entry) => hazardSchema.parse(entry)), 'hazard'),
    minions: indexById(raw.minions.map((entry) => minionSchema.parse(entry)), 'minion'),
    programs: indexById(raw.programs.map((entry) => bossProgramSchema.parse(entry)), 'boss program'),
    encounters: indexById(raw.encounters.map((entry) => encounterSchema.parse(entry)), 'encounter'),
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

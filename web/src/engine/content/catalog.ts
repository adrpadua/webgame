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
    statuses: indexById((raw.statuses ?? []).map((entry) => statusSchema.parse(entry)), 'status'),
    programs: indexById(raw.programs.map((entry) => bossProgramSchema.parse(entry)), 'boss program'),
    encounters: indexById(raw.encounters.map((entry) => encounterSchema.parse(entry)), 'encounter'),
    decks: indexById((raw.decks ?? []).map((entry) => evaluationDeckSchema.parse(entry)), 'deck'),
    scenarios: indexById((raw.scenarios ?? []).map((entry) => scenarioSchema.parse(entry)), 'scenario'),
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

import { buildCatalog, type ContentCatalog } from '@/engine'

// The encounter the Workbench and tooling open by default.
export const DEFAULT_ENCOUNTER_ID = 'embermaw_prototype'

// The same Ashen Trial dealt with a five-card opening Hand, which is exactly
// what the scripted first turn spends: two Slots prepared, both charged, and
// one card paid to step out of the breath cone. A first-time player opens
// here; everyone else opens the default encounter.
export const FIRST_TURN_ENCOUNTER_ID = 'embermaw_first_turn'

// Loads every authored JSON payload from the repo-level data/ directory
// (ADR 0020). Validation happens inside buildCatalog via the zod schemas.
const modules = import.meta.glob('../../../data/{cards,keywords,charge_modifiers,hazards,minions,boss_programs,encounters,decks,scenarios}/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

function group(directory: string): unknown[] {
  return Object.entries(modules)
    .filter(([path]) => path.includes(`/data/${directory}/`))
    .map(([, payload]) => payload)
}

let cachedCatalog: ContentCatalog | null = null

export function loadCatalog(): ContentCatalog {
  if (cachedCatalog === null) {
    cachedCatalog = buildCatalog({
      cards: group('cards'),
      keywords: group('keywords'),
      chargeModifiers: group('charge_modifiers'),
      hazards: group('hazards'),
      minions: group('minions'),
      programs: group('boss_programs'),
      encounters: group('encounters'),
      decks: group('decks'),
      scenarios: group('scenarios'),
    })
  }
  return cachedCatalog
}

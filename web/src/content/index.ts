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
const modules = import.meta.glob('../../../data/{cards,heroes,bosses,keywords,charge_modifiers,hazards,minions,counters,boss_programs,encounters,decks,scenarios}/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

// Each payload keeps the repo-relative path it was authored in, so a schema
// failure names the file rather than a line inside the parser. The glob keys
// are relative to this module; everything from `data/` on is the path a
// designer would type.
function group(directory: string): unknown[] {
  return Object.entries(modules)
    .filter(([path]) => path.includes(`/data/${directory}/`))
    .map(([path, payload]) => ({ source: path.slice(path.indexOf('/data/') + 1), payload }))
}

let cachedCatalog: ContentCatalog | null = null

export function loadCatalog(): ContentCatalog {
  if (cachedCatalog === null) {
    cachedCatalog = buildCatalog({
      cards: group('cards'),
      heroes: group('heroes'),
      bosses: group('bosses'),
      keywords: group('keywords'),
      chargeModifiers: group('charge_modifiers'),
      hazards: group('hazards'),
      minions: group('minions'),
      counters: group('counters'),
      programs: group('boss_programs'),
      encounters: group('encounters'),
      decks: group('decks'),
      scenarios: group('scenarios'),
    })
  }
  return cachedCatalog
}

import type { WorkbenchCatalog } from '@/store/workbench'

// The Encounter Picker's list, as one pure function so the offer is testable
// and mutation-guarded: what ships is exactly the Encounters authored
// `player_facing`, in authored order. An evaluation probe — authored to be
// measured, never played (D-076) — is absent because its flag defaults
// false, not because a UI list remembered to exclude it.

export interface EncounterChoice {
  id: string
  title: string
  rulesText: string
  // How many seats the Encounter fields: the picker's one mechanical fact,
  // because "Solo" versus "Party of 2" is the difference the roster grew.
  partySize: number
}

export function encounterChoices(catalog: WorkbenchCatalog): EncounterChoice[] {
  return Object.values(catalog.encounters)
    .filter((encounter) => encounter.player_facing)
    .map((encounter) => ({
      id: encounter.id,
      title: encounter.title,
      rulesText: encounter.rules_text,
      partySize: encounter.party.length,
    }))
}

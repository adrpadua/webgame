import type { ContentCatalog } from './content/catalog'
import type { Keyword } from './content/schemas'

export type KeywordKind = Keyword['kind']

// The Keywords the engine names by id. Every one of these is a contract
// between engine code and `data/keywords/`, and it used to be an unwritten
// one: `damage_classification` was an unvalidated string on both sides, so a
// typo in a Beat — or a renamed keyword — silently stopped Riposte Ready from
// ever being granted, with no load error and no failing test. Naming them here
// lets the catalog assert at load that every id the rules will compare against
// exists, and exists as the right kind.
export const TANK_HIT = 'tank_hit'
export const RAID_HIT = 'raid_hit'

export const ENGINE_KEYWORDS: { id: string; kind: KeywordKind }[] = [
  { id: TANK_HIT, kind: 'damage_type' },
  { id: RAID_HIT, kind: 'damage_type' },
]

// Which kinds each authored reference accepts. A reference is a join into the
// one Keyword namespace, so the id existing is only half the check — the other
// half is that it names the right sort of thing. `damage_classification:
// "guard"` is spelled correctly and is still nonsense.
export const KEYWORD_REFERENCES = {
  // A card carries what it does and, for a Role deck, whose it is.
  cardTag: ['trait', 'role'] as KeywordKind[],
  // A Charge Modifier matches on the same axis a card is tagged with.
  chargeModifierMatch: ['trait', 'role'] as KeywordKind[],
  damageClassification: ['damage_type'] as KeywordKind[],
  targetSelector: ['role'] as KeywordKind[],
  counterTag: ['answer'] as KeywordKind[],
  // A Counter is tagged with what sort of thing it is, so a card can read
  // "every fire Counter" without naming each one.
  counterKeyword: ['trait'] as KeywordKind[],
}

// Display title for an authored Keyword id. Content stores ids; every surface
// that shows one resolves it here, so renaming a Keyword's wording never means
// editing the Beats that reference it.
export function keywordTitle(catalog: ContentCatalog, id: string): string {
  return catalog.keywords[id]?.title ?? id
}

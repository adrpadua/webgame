import type { ContentCatalog } from './content/catalog'
import type { Keyword } from './content/schemas'

export type KeywordKind = Keyword['kind']

// The Keywords the engine names by id. Every one of these is a contract
// between engine code and `data/keywords/`, and it used to be an unwritten
// one: the Beat damage keyword was an unvalidated string on both sides, so a
// typo in a Beat — or a renamed keyword — silently stopped the riposte grant
// (then a Counter, now the Signature's standing clause, D-064) from ever
// firing, with no load error and no failing test. Naming them here
// lets the catalog assert at load that every id the rules will compare against
// exists, and exists as the right kind.
export const TANK_HIT = 'tank_hit'
export const RAID_HIT = 'raid_hit'
// The Role the front line belongs to. Named here for the same reason the two
// damage Keywords are: the board marks the Guarded Front only for a Tank, and
// a renamed `tank.json` would take that mark away with no load error and no
// failing test — the mark would simply stop appearing.
export const TANK = 'tank'

export const ENGINE_KEYWORDS: { id: string; kind: KeywordKind }[] = [
  { id: TANK_HIT, kind: 'damage_type' },
  { id: RAID_HIT, kind: 'damage_type' },
  { id: TANK, kind: 'role' },
]

// Which kinds each authored reference accepts. A reference is a join into the
// one Keyword namespace, so the id existing is only half the check — the other
// half is that it names the right sort of thing. `damage_keywords: [
// "guard"]` is spelled correctly and is still nonsense.
export const KEYWORD_REFERENCES = {
  // A card carries what it does and, for a Role deck, whose it is.
  cardTag: ['trait', 'role'] as KeywordKind[],
  // A Charge Modifier matches on the same axis a card is tagged with.
  chargeModifierMatch: ['trait', 'role'] as KeywordKind[],
  damageKeywords: ['damage_type'] as KeywordKind[],
  targetSelector: ['role'] as KeywordKind[],
  answerTag: ['answer'] as KeywordKind[],
  // A Counter is tagged with what sort of thing it is, so a card can read
  // "every fire Counter" without naming each one.
  counterKeyword: ['trait'] as KeywordKind[],
}

// The Role the Encounter's Player Hero plays, or '' where the deck they bring
// does not say.
//
// Read off the deck rather than from a field on the Hero, because a Role
// Keyword already *is* that statement: `keywordSchema` has every card in a
// Hero's deck carrying their Role, which is why the Hand leaves the mark off a
// glance surface. A `primary_hero_role` beside it would be a second copy of
// one fact, and the copy nothing reads is the one that goes stale.
//
// The Role is therefore the Role Keyword the whole deck agrees on: a card
// missing it, or two Roles across the list, is a deck that names no single
// Hero, and this says so rather than guessing at the majority.
export function heroRole(catalog: ContentCatalog, encounterId: string): string {
  const encounter = catalog.encounters[encounterId]
  if (!encounter) {
    return ''
  }
  let shared: string[] | null = null
  for (const entry of encounter.player_deck) {
    const roles = (catalog.cards[entry.card]?.tags ?? []).filter((tag) => catalog.keywords[tag]?.kind === 'role')
    shared = shared === null ? roles : shared.filter((role) => roles.includes(role))
  }
  return shared !== null && shared.length === 1 ? shared[0] : ''
}

// Display title for an authored Keyword id. Content stores ids; every surface
// that shows one resolves it here, so renaming a Keyword's wording never means
// editing the Beats that reference it.
export function keywordTitle(catalog: ContentCatalog, id: string): string {
  return catalog.keywords[id]?.title ?? id
}

// The mark a Counter wears on the HUD (party-frame direction 1A's Status
// Icon): which glyph is cut into the square, and which material the square's
// leading edge and glyph are made of.
//
// Presentation, keyed by Counter id, the way `keywordIcons.tsx` keys a
// Hero's Keyword marks: what a Counter *does* is authored in
// `data/counters/`, and what it *looks like* is the interface direction's
// material language, which no content file should be spelling in hex. A
// Counter with no mark here is not a load error — it falls back to the
// neutral steel mark and still reads as a Counter, which is what keeps a
// freshly authored rule visible on the frame the day it lands.
//
// The material is the direction's channel, not decoration:
//   ember  — damage taken; the affliction that makes a blow land harder
//   coral  — the Boss's own body, on a Counter the Boss is carrying
//   glass  — Armor and the player's own affordances
//   gold   — lockwork: a certified cover, a charge held
//   steel  — a blunted edge, and anything unmarked
export type StatusGlyph = 'flame' | 'crack' | 'shield' | 'blocks' | 'cross' | 'spike' | 'chain' | 'mark'

export type StatusMaterial = 'ember' | 'coral' | 'glass' | 'gold' | 'cloth' | 'steel'

export interface StatusMark {
  glyph: StatusGlyph
  material: StatusMaterial
}

// An unmarked Counter: a plain rhombus in oathsteel. It says "this piece is
// carrying an authored rule, hold to read it" and claims nothing else, which
// is the honest thing to draw for a rule this file has never heard of.
export const NEUTRAL_MARK: StatusMark = { glyph: 'mark', material: 'steel' }

const MARKS: Record<string, StatusMark> = {
  // Burning: the Hero takes more from every blow while the sear is on them.
  seared: { glyph: 'flame', material: 'ember' },
  // The same fire, held by the thing that set it — so it is drawn in the
  // Boss's own coral rather than in the ember of a wound.
  heat: { glyph: 'flame', material: 'coral' },
  // Armour split open: the piece takes more from every source.
  sundered: { glyph: 'crack', material: 'ember' },
  // A dulled edge: the piece deals less. Steel, because what changed is the
  // weapon rather than the wound.
  weakened: { glyph: 'spike', material: 'steel' },
  // Banked Armor, in the runeglass the Armor overlay already uses.
  fortified: { glyph: 'shield', material: 'glass' },
  // The Registry's cover on the next blow: lockwork gold, the cross the
  // healing marks are drawn with.
  underwritten: { glyph: 'cross', material: 'gold' },
}

export function statusMark(counterId: string): StatusMark {
  return MARKS[counterId] ?? NEUTRAL_MARK
}

// The one-line reading of a Counter's state, used as the icon's accessible
// name and its title: the square carries the glyph, and this carries what the
// glyph cannot — which Counter it is, how many are held, how long it lasts.
export function statusLabel(title: string, count: number, remainingRounds: number): string {
  const held = count > 1 ? `${title}, ${count} held` : title
  return remainingRounds > 0 ? `${held}, ${remainingRounds} round${remainingRounds === 1 ? '' : 's'} left` : held
}

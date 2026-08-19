import { hexDistance, isLegalMove, parseHexKey, type ContentCatalog, type EncounterState } from '@/engine'
import { slotTakesCharge, slotWantedKeywords } from './slots'

// What a card in hand actually is, right now.
//
// The Compact Card face states a card's identity — title, window speed,
// Charge Value — and every one of those is a fact about the card as a *Top
// Card*. Inside a player window it is rarely going to be one: both Slots are
// normally loaded already, and what a hand card can do there reads nothing
// off its identity. Tucked, it adds one Charge and its Keywords meet the Top
// Card's Charge Modifiers; spent in Quick, it is one Stamina and one hex, and
// which card paid does not matter at all.
//
// So the Hand wears one of three faces, and each says what the card is for in
// the gesture the player is currently in the middle of.
export type HandFace =
  // The card as itself: its name, its timing, what it would hold in a Slot.
  | 'card'
  // A player window: Keywords, because that is the part a Slot reads. Both
  // windows take this face — Charge Timing lets any card be tucked in either
  // one regardless of its own speed, so a Compact Card's timing is no more
  // use in Slow than in Quick.
  | 'keywords'
  // A move is being lined up: every card is one Stamina and nothing else.
  | 'stamina'

// The in-flight gesture, as the Workbench store holds it. A move is being
// lined up when a card is in hand or in flight — dragged, or selected for the
// tap path — or the Hero is being held for a route preview, and the pointer
// is over a hex the Hero could step to.
export interface MoveGesture {
  hoveredHexKey: string | null
  draggingCardId: string | null
  selectedCardId: string | null
  heroRoutePreview: boolean
}

// True while the pointer sits over an adjacent hex the Hero could legally
// enter, with something in hand or the Hero held. This is the same trio the
// board reads to light its legal destinations, narrowed to the one hex the
// pointer is actually over: the board says where you may go, and this says
// you are asking to go there.
export function movePrepped(state: EncounterState, gesture: MoveGesture): boolean {
  if (!state.active || state.phase !== 'quick' || gesture.hoveredHexKey === null) {
    return false
  }
  if (gesture.draggingCardId === null && gesture.selectedCardId === null && !gesture.heroRoutePreview) {
    return false
  }
  const hero = state.board.entities[state.primaryHeroId]
  if (!hero) {
    return false
  }
  const destination = parseHexKey(gesture.hoveredHexKey)
  // Distance is asked separately: isLegalMove permits a zero-length move, so
  // the Hero's own tile would otherwise read as a destination.
  return hexDistance(hero.coords, destination) === 1 && isLegalMove(state.board, state.primaryHeroId, destination)
}

export function handFace(state: EncounterState, prepped: boolean): HandFace {
  if (prepped) {
    return 'stamina'
  }
  // Loadout is the exception among the three phases a card is playable in: it
  // is the step for choosing Top Cards, and a Top Card is exactly what the
  // card face describes.
  return state.active && (state.phase === 'quick' || state.phase === 'slow') ? 'keywords' : 'card'
}

// The Keywords worth drawing on a card in hand: the authored order, minus the
// Roles. Every card in a Hero's deck carries their Role's Keyword, so its mark
// appears on all of them at once and separates none of them — it costs a
// glyph's worth of the face to say what the Hero already says. The full list
// stays on the Detail Popup, which is a read rather than a glance.
//
// Read off `kind` rather than a separate flag: being a Role is the reason it
// says nothing here, so the two were never independent facts to keep in sync.
//
// A card that is nothing but its Role keeps it: an empty row would read as a
// card with no Keywords at all, which is a different claim.
export function shownKeywords(catalog: ContentCatalog, tags: string[]): string[] {
  const shown = tags.filter((tag) => catalog.keywords[tag]?.kind !== 'role')
  return shown.length > 0 ? shown : tags
}

// The Keywords that would pay off if a card carrying one were tucked right
// now: what the Slots are hunting for, narrowed to the Slots that can still
// take the card. A Slot that has activated this window, or whose stack is
// already full, cannot accept it — so its wants promise nothing and stay off
// the Hand. The Action Bar draws the same wants on the Slot itself, from the
// same two predicates, so a gold Keyword in hand always has a Slot showing
// the mark it answers.
export function payingKeywords(catalog: ContentCatalog, state: EncounterState): Set<string> {
  const paying = new Set<string>()
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return paying
  }
  for (const slot of hero.actionBar) {
    if (!slotTakesCharge(catalog, state, slot)) {
      continue
    }
    for (const keywordId of slotWantedKeywords(catalog, slot)) {
      paying.add(keywordId)
    }
  }
  return paying
}

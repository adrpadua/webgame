import { cardChargeCap, hexDistance, isLegalMove, parseHexKey, type ContentCatalog, type EncounterState } from '@/engine'

// What a card in hand actually is, right now.
//
// The Compact Card face states a card's identity — title, window speed,
// Charge Value — and every one of those is a fact about the card as a *Top
// Card*. In the Quick Window it is rarely going to be one: both Slots are
// normally loaded already, and the two things a hand card can do there read
// nothing off its identity. Tucked, it adds one Charge and its Keywords meet
// the Top Card's Charge Modifiers; spent, it is one Stamina and one hex, and
// which card paid does not matter at all.
//
// So the Hand wears one of three faces, and each says what the card is for in
// the gesture the player is currently in the middle of.
export type HandFace =
  // The card as itself: its name, its timing, what it would hold in a Slot.
  | 'card'
  // The Quick Window: Keywords, because that is the part a Slot reads.
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
  return state.active && state.phase === 'quick' ? 'keywords' : 'card'
}

// The Keywords that would pay off if a card carrying one were tucked right
// now: every keyword-specific Charge Modifier on a Top Card whose Slot can
// still take a Charge. A Slot that has activated this window, or whose stack
// is already full, cannot accept the card — so its modifiers promise nothing
// and its Keywords stay quiet. Modifiers that count every charge regardless
// of Keyword (Charged Assault) name none, and light none: they pay for the
// Charge itself, which is not a property of the card being chosen.
export function payingKeywords(catalog: ContentCatalog, state: EncounterState): Set<string> {
  const paying = new Set<string>()
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return paying
  }
  for (const slot of hero.actionBar) {
    if (slot.topCard === null || slot.activatedWindow === state.phase) {
      continue
    }
    const topCard = catalog.cards[slot.topCard.cardId]
    if (slot.charges.length >= cardChargeCap(topCard)) {
      continue
    }
    for (const modifierId of topCard.charge_modifiers) {
      const keywordId = catalog.chargeModifiers[modifierId]?.keyword_id ?? ''
      if (keywordId !== '') {
        paying.add(keywordId)
      }
    }
  }
  return paying
}

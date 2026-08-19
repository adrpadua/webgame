import { cardChargeCap, cardWindowSpeed, type Card, type EncounterState } from '@/engine'
import type { WorkbenchCatalog } from '@/store/workbench'

// The Hero Frame's Signature control (D-065): one permanent button that is
// also the resource meter. Its face is a small closed state machine, held
// here as a pure function so the frame and the tests read one definition —
// the same one-predicate discipline `slots.ts` keeps for the Action Bar.
//
//   ready  — at least one earned Charge, the printed window is open, not yet
//            fired: the button ignites and a tap fires the Slot.
//   spent  — fired in the open window; it relights when the window turns.
//   banked — Charges held while the Signature's window is closed. The bank
//            read (D-064 decision 13) lives here: the player sees a held
//            stack through the windows it cannot act in.
//   empty  — no Charges. The visibly unlit meter is what teaches the earn.
export type SignatureFace = 'empty' | 'banked' | 'ready' | 'spent'

export interface SignatureControl {
  slotIndex: number
  card: Card
  charges: number
  cap: number
  face: SignatureFace
  // What the Hero Frame calls the earned Charges: the authored
  // resource_title, falling back to the card's own title.
  resourceTitle: string
}

// The primary Hero's Signature, or null when the Encounter fields none — the
// teaching slice runs a two-Slot bar and its Hero Frame simply has no
// Signature section (D-065).
export function signatureControl(catalog: WorkbenchCatalog, state: EncounterState): SignatureControl | null {
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }
  const slotIndex = hero.actionBar.findIndex((slot) => slot.fixed && slot.topCard !== null)
  if (slotIndex < 0) {
    return null
  }
  const slot = hero.actionBar[slotIndex]
  const card = catalog.cards[(slot.topCard as { cardId: string }).cardId]
  const charges = slot.earnedCharges
  const face: SignatureFace =
    slot.activatedWindow !== null
      ? 'spent'
      : charges === 0
        ? 'empty'
        : state.active && cardWindowSpeed(card) === state.phase
          ? 'ready'
          : 'banked'
  return {
    slotIndex,
    card,
    charges,
    cap: cardChargeCap(card),
    face,
    resourceTitle: card.resource_title !== '' ? card.resource_title : card.title,
  }
}

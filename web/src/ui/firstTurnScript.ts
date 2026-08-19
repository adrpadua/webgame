import {
  cardWindowSpeed,
  hexKey,
  isLegalMove,
  neighbors,
  type Card,
  type CardInstance,
  type EncounterState,
  type HexKey,
  type SlotState,
} from '@/engine'
import type { WorkbenchCatalog } from '@/store/workbench'
import type { HoldDetail } from './HoldPopover'
import { slotCanFire } from './slots'

// The scripted first turn.
//
// The script is derived from the live Encounter state rather than played
// from a step counter: whatever the player did, the current step is the
// first thing the Round still needs. That keeps it honest under time
// travel, restarts, and a player who wanders off the path — and it means
// the script can never claim a step the rules would reject.
//
// One Round covers the whole vocabulary: prepare two Slots, charge one,
// fire it in the Quick Window, step out of the telegraphed cone, then
// charge and fire the slow Slot in the Slow Window.

// The controls a step leaves live. Everything else on the play surface is
// dimmed and inert while the script runs, so there is exactly one thing to
// press at any moment.
// `undo` is in the union and in no step's targets, which is the point: the
// scripted turn keeps one live control at a time, and a script that can be
// walked backwards is not a script. Naming it here is what makes
// blocksTarget gate it.
export type FirstTurnTarget = 'hand' | 'slot-0' | 'slot-1' | 'next' | 'undo' | 'board'

export interface FirstTurnStep {
  id: string
  // Four words or so, imperative. The explanation lives in `detail`.
  cue: string
  // Which control the cue is pointing at, as a short label.
  targetLabel: string
  detail: HoldDetail
  targets: FirstTurnTarget[]
  // The one hand card this step wants, when it wants one.
  cardInstanceId: string | null
  // Hexes that both dodge the telegraph and are legal to enter.
  safeHexKeys: HexKey[]
  // How far through the scripted Round this step sits, for the progress dots.
  ordinal: number
}

export const FIRST_TURN_STEP_COUNT = 8

// The card the script points at for a given window: an unconditional attack
// where possible, so firing it never asks for a Minion target the opening
// board does not have.
function pickCard(catalog: WorkbenchCatalog, hand: CardInstance[], speed: 'quick' | 'slow'): CardInstance | null {
  const matching = hand.filter((instance) => cardWindowSpeed(catalog.cards[instance.cardId]) === speed && catalog.cards[instance.cardId].damage === 0)
  if (matching.length === 0) {
    return null
  }
  const attacker = matching.find((instance) => catalog.cards[instance.cardId].boss_damage > 0)
  return attacker ?? matching[0]
}

function detail(id: string, title: string, text: string, hint?: string): HoldDetail {
  return { id: `first-turn:${id}`, title, tone: 'neutral', text, hint }
}

interface StepInput {
  id: string
  cue: string
  targetLabel: string
  detail: HoldDetail
  targets: FirstTurnTarget[]
  ordinal: number
  cardInstanceId?: string | null
  safeHexKeys?: HexKey[]
}

function step(input: StepInput): FirstTurnStep {
  return {
    cardInstanceId: null,
    safeHexKeys: [],
    ...input,
  }
}

// Hexes that leave the telegraphed pattern the Boss is about to resolve.
export function safeMoveHexes(state: EncounterState): HexKey[] {
  const hero = state.board.entities[state.primaryHeroId]
  if (!hero) {
    return []
  }
  return neighbors(state.board.hexes, hero.coords)
    .filter((destination) => isLegalMove(state.board, state.primaryHeroId, destination) && state.telegraphs[hexKey(destination)] === undefined)
    .map(hexKey)
}

function standingInTelegraph(state: EncounterState): boolean {
  const hero = state.board.entities[state.primaryHeroId]
  return hero !== undefined && state.telegraphs[hexKey(hero.coords)] !== undefined
}

function chargeable(slot: SlotState | undefined): boolean {
  return slot !== undefined && slot.topCard !== null && slot.activatedWindow === null && slot.charges.length === 0
}

function slotCardTitle(catalog: WorkbenchCatalog, slot: SlotState | undefined, fallback: string): string {
  const card: Card | undefined = slot?.topCard ? catalog.cards[slot.topCard.cardId] : undefined
  return card?.title ?? fallback
}

// The step the scripted Round is waiting on, or null once it is over.
export function firstTurnStep(catalog: WorkbenchCatalog, state: EncounterState): FirstTurnStep | null {
  if (!state.active || state.round !== 1) {
    return null
  }
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }
  const [quickSlot, slowSlot] = hero.actionBar
  const hasHand = hero.hand.length > 0

  switch (state.phase) {
    case 'loadout': {
      if (quickSlot?.topCard === null) {
        const card = pickCard(catalog, hero.hand, 'quick')
        if (card) {
          return step({
            id: 'prepare-quick',
            cue: `Prepare ${catalog.cards[card.cardId].title}`,
            targetLabel: 'Slot 1',
            cardInstanceId: card.instanceId,
            targets: ['hand', 'slot-0'],
            ordinal: 1,
            detail: detail(
              'prepare-quick',
              'Prepare a Slot',
              'A Slot holds one Top Card for the whole Encounter. Drag the card onto the Slot, or tap the card and then the Slot.',
              'Quick cards fire in the Quick Window.',
            ),
          })
        }
      }
      if (slowSlot?.topCard === null) {
        const card = pickCard(catalog, hero.hand, 'slow')
        if (card) {
          return step({
            id: 'prepare-slow',
            cue: `Prepare ${catalog.cards[card.cardId].title}`,
            targetLabel: 'Slot 2',
            cardInstanceId: card.instanceId,
            targets: ['hand', 'slot-1'],
            ordinal: 2,
            detail: detail(
              'prepare-slow',
              'Prepare the slow Slot',
              'Slow cards hit harder but wait for the Slow Window at the end of the Round. Keep one Slot on each speed.',
            ),
          })
        }
      }
      return step({
        id: 'start-round',
        cue: 'Begin the Round',
        targetLabel: 'Next',
        targets: ['next'],
        ordinal: 3,
        detail: detail('start-round', 'Both Slots are set', 'Embermaw acts first every Round. Nothing you prepared is spent yet.'),
      })
    }

    case 'instant':
      return step({
        id: 'boss-instant',
        cue: 'Embermaw strikes',
        targetLabel: 'Next',
        targets: ['next'],
        ordinal: 3,
        detail: detail(
          'boss-instant',
          'Boss Instant',
          'The Instant beats land immediately — Raking Claw cannot be dodged. Armor is how you answer it. Next moves on once they have landed.',
        ),
      })

    case 'quick': {
      if (chargeable(quickSlot) && hasHand) {
        return step({
          id: 'charge-quick',
          cue: 'Add a Charge',
          targetLabel: 'Slot 1',
          cardInstanceId: hero.hand[0].instanceId,
          targets: ['hand', 'slot-0'],
          ordinal: 4,
          detail: detail(
            'charge-quick',
            'Charge the Slot',
            'Tucking a hand card under a Slot charges it. A Slot needs at least one Charge to fire, and some cards pay off every card in the stack.',
          ),
        })
      }
      if (quickSlot && slotCanFire(catalog, state, quickSlot)) {
        return step({
          id: 'fire-quick',
          cue: `Fire ${slotCardTitle(catalog, quickSlot, 'the Slot')}`,
          targetLabel: 'Slot 1',
          targets: ['slot-0'],
          ordinal: 5,
          detail: detail('fire-quick', 'Fire in the Quick Window', 'A glowing Slot matches this window. Tap it to resolve its Top Card and its Charge Stack.'),
        })
      }
      if (standingInTelegraph(state) && hasHand) {
        const safeHexKeys = safeMoveHexes(state)
        if (safeHexKeys.length > 0) {
          return step({
            id: 'move-away',
            cue: 'Step off the cone',
            targetLabel: 'Board',
            cardInstanceId: hero.hand[0].instanceId,
            targets: ['hand', 'board'],
            safeHexKeys,
            ordinal: 6,
            detail: detail(
              'move-away',
              'Move out of the telegraph',
              'The orange hexes are the Cinder Breath Embermaw has already aimed. Discard a hand card for Stamina and step to a clear hex.',
              'Movement happens only in the Quick Window.',
            ),
          })
        }
      }
      return step({
        id: 'quick-done',
        cue: 'Let it come',
        targetLabel: 'Next',
        targets: ['next'],
        ordinal: 6,
        detail: detail('quick-done', 'Quick Window spent', 'What you set up now has to survive the telegraphed beats.'),
      })
    }

    case 'incoming':
      return step({
        id: 'boss-incoming',
        cue: 'The cone burns',
        targetLabel: 'Next',
        targets: ['next'],
        ordinal: 6,
        detail: detail(
          'boss-incoming',
          'Boss Incoming',
          'The marked cone resolves and Whelps arrive on the marked hexes. Standing clear is the whole answer. Next moves on once the beats have landed.',
        ),
      })

    case 'slow': {
      if (chargeable(slowSlot) && hasHand) {
        return step({
          id: 'charge-slow',
          cue: 'Charge your guard',
          targetLabel: 'Slot 2',
          cardInstanceId: hero.hand[0].instanceId,
          targets: ['hand', 'slot-1'],
          ordinal: 7,
          detail: detail('charge-slow', 'Charge the slow Slot', 'Charge can be added in either of your windows — the Slot only fires in the one that matches its Top Card.'),
        })
      }
      if (slowSlot && slotCanFire(catalog, state, slowSlot)) {
        return step({
          id: 'fire-slow',
          cue: `Fire ${slotCardTitle(catalog, slowSlot, 'the Slot')}`,
          targetLabel: 'Slot 2',
          targets: ['slot-1'],
          ordinal: 8,
          detail: detail(
            'fire-slow',
            'Fire in the Slow Window',
            'The heavy end of the Round. Armor is wiped when the Round turns — damage dealt is not.',
          ),
        })
      }
      return step({
        id: 'end-round',
        cue: 'End the Round',
        targetLabel: 'Next',
        targets: ['next'],
        ordinal: 8,
        detail: detail('end-round', 'Round complete', 'Your Hand refills, Armor resets, and Embermaw moves to its next pattern. You are on your own from here.'),
      })
    }
  }
}

// While the script runs, every control it did not name is inert.
export function blocksTarget(step: FirstTurnStep | null, target: FirstTurnTarget): boolean {
  return step !== null && !step.targets.includes(target)
}

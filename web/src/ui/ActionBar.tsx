import { cardChargeCap, cardWindowSpeed, legality, type SlotState } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { blocksTarget } from './firstTurnScript'
import { useFirstTurnStep } from './useFirstTurn'
import { slotCanFire } from './slots'
import { slotDetail } from './holdDetails'
import { useHold, type HoldDetail } from './HoldPopover'
import { FOCUS_RING_CLASS, GATED_CLASS, SPOTLIGHT_CLASS, windowDotClass } from './theme'

// The persistent Action Bar. Each Slot shows its Top Card, its Charge Stack
// as pips, and its state as one colour — the rules text is a hold away. Tap
// a glowing Slot in its matching window to fire it; while a Compact Card is
// in hand, each Slot shows the word for what it would receive.

const EMPTY_SLOT_DETAIL: HoldDetail = {
  id: 'slot:empty',
  title: 'Empty Slot',
  tone: 'neutral',
  text: 'A Slot holds one Top Card for the rest of the Encounter, plus the Charge Stack tucked under it.',
  hint: 'Drag a card here, or tap the card then the Slot.',
}

type SlotStateName = 'empty' | 'loaded' | 'charged' | 'primed' | 'fired'

function slotStateName(slot: SlotState, chargeCap: number): SlotStateName {
  if (slot.topCard === null) {
    return 'empty'
  }
  if (slot.activatedWindow !== null) {
    return 'fired'
  }
  if (slot.charges.length === chargeCap) {
    return 'primed'
  }
  return slot.charges.length > 0 ? 'charged' : 'loaded'
}

const STATE_LABEL: Record<SlotStateName, string> = {
  empty: '',
  loaded: 'Loaded',
  charged: 'Charged',
  primed: 'Primed',
  fired: 'Fired',
}

const STATE_TONE: Record<SlotStateName, string> = {
  empty: 'text-zinc-600',
  loaded: 'text-zinc-500',
  charged: 'text-amber-400',
  primed: 'text-amber-300',
  fired: 'text-emerald-400',
}

export function ActionBar() {
  const state = useWorkbench(selectState)
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }
  return (
    <div className="flex gap-2 border-t border-zinc-800 bg-zinc-900/80 px-4 py-2" data-testid="action-bar">
      {hero.actionBar.map((_, slotIndex) => (
        <Slot key={slotIndex} slotIndex={slotIndex} />
      ))}
    </div>
  )
}

function Slot({ slotIndex }: { slotIndex: number }) {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const fireSlot = useWorkbench((store) => store.fireSlot)
  const cardDroppedOnSlot = useWorkbench((store) => store.cardDroppedOnSlot)
  const selectedCardId = useWorkbench((store) => store.selectedCardId)
  const draggingCardId = useWorkbench((store) => store.draggingCardId)
  const step = useFirstTurnStep()

  const hero = state.heroes[state.primaryHeroId]
  const slot = hero.actionBar[slotIndex]
  const card = slot.topCard ? catalog.cards[slot.topCard.cardId] : null
  const chargeCap = card ? cardChargeCap(card) : 0
  const stateName = slotStateName(slot, chargeCap)
  const canFire = slotCanFire(catalog, state, slot)
  const incomingCardId = selectedCardId ?? draggingCardId
  const hold = useHold(card ? slotDetail(card, slot, slotIndex, state.phase) : EMPTY_SLOT_DETAIL)

  const target = slotIndex === 0 ? 'slot-0' : 'slot-1'
  const gated = blocksTarget(step, target)
  const spotlit = !gated && step !== null && step.targets.includes(target) && step.cardInstanceId === null
  // A gated Slot never pulses: an opacity animation outranks the dimming and
  // would make an inert control the brightest thing on screen.
  const pulse = gated ? '' : 'animate-pulse motion-reduce:animate-none'

  // What would landing the in-hand card here do, and is it legal? A card
  // placed into a Slot that began this Loadout empty is tentative, so
  // landing another card there Swaps it back to hand; Replace — and its
  // confirmation — is reserved for bundles the Slot carried into the Round.
  let incomingAction: 'Prepare' | 'Charge' | 'Replace' | 'Swap' | null = null
  let incomingLegal = false
  if (incomingCardId !== null) {
    incomingAction = slot.topCard === null ? 'Prepare' : state.phase === 'loadout' ? (slot.placedThisLoadout ? 'Swap' : 'Replace') : 'Charge'
    incomingLegal = legality(catalog, state, {
      kind: incomingAction === 'Charge' ? 'charge_slot' : 'load_slot',
      sourceId: state.primaryHeroId,
      slotIndex,
      cardInstanceId: incomingCardId,
    }).legal
  }

  return (
    <button
      type="button"
      data-testid={`slot-${slotIndex}`}
      data-top-card={slot.topCard?.cardId ?? ''}
      data-charges={slot.charges.length}
      data-slot-state={stateName}
      data-incoming-action={incomingAction ?? ''}
      data-incoming-legal={incomingAction === null ? '' : String(incomingLegal)}
      aria-label={card ? `Slot ${slotIndex + 1}: ${card.title}, ${STATE_LABEL[stateName]}` : `Slot ${slotIndex + 1}: empty`}
      {...hold.holdProps}
      onClick={() => {
        if (hold.consumeHold()) {
          return
        }
        if (selectedCardId !== null) {
          cardDroppedOnSlot(selectedCardId, slotIndex)
          return
        }
        if (canFire) {
          fireSlot(slotIndex)
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const cardInstanceId = event.dataTransfer.getData('text/plain')
        if (cardInstanceId !== '') {
          cardDroppedOnSlot(cardInstanceId, slotIndex)
        }
      }}
      className={`relative min-h-20 flex-1 rounded-xl border-2 p-2 text-left transition ${FOCUS_RING_CLASS} ${
        incomingCardId !== null && incomingLegal
          ? incomingAction === 'Replace'
            ? `border-amber-400 bg-amber-950/50 ${pulse}`
            : `border-emerald-400 bg-emerald-950/50 ${pulse}`
          : canFire
            ? `border-emerald-500 bg-emerald-950/60 hover:bg-emerald-900/60 ${pulse}`
            : stateName === 'primed'
              ? 'border-amber-500 bg-amber-950/40'
              : card
                ? 'border-zinc-600 bg-zinc-800/70'
                : 'border-dashed border-zinc-700 bg-zinc-900/40'
      } ${spotlit ? SPOTLIGHT_CLASS : ''} ${gated ? GATED_CLASS : ''}`}
    >
      {incomingAction !== null && (
        <span
          className={`absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
            !incomingLegal
              ? 'bg-zinc-700 text-zinc-400 line-through'
              : incomingAction === 'Replace'
                ? 'bg-amber-500 text-amber-950'
                : 'bg-emerald-500 text-emerald-950'
          }`}
        >
          {incomingAction}
        </span>
      )}
      {card ? (
        <>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xs font-bold text-zinc-100">{card.title}</span>
            <span className={`h-2 w-2 shrink-0 rounded-full ${windowDotClass(cardWindowSpeed(card))}`} aria-hidden="true" />
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            {Array.from({ length: chargeCap }, (_, index) => (
              <span key={index} className={`h-2.5 w-2.5 rounded-full ${index < slot.charges.length ? 'bg-amber-400' : 'bg-zinc-700'}`} />
            ))}
          </div>
          <div className={`mt-1 text-[10px] font-semibold ${STATE_TONE[stateName]}`}>{STATE_LABEL[stateName]}</div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-2xl leading-none font-light text-zinc-700" aria-hidden="true">
          +
        </div>
      )}
    </button>
  )
}

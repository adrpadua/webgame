import { cardChargeCap, cardWindowSpeed, legality, type SlotState } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { blocksTarget } from './firstTurnScript'
import { useFirstTurnStep } from './useFirstTurn'
import { slotCanFire } from './slots'
import { slotDetail } from './holdDetails'
import { useHold, type HoldDetail } from './HoldPopover'
import { LockHead, type LockState } from './icons'
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

// Only Primed wears gold in the label: it is the state that can fire.
// Fired is the state that cannot, and it must not borrow the live colour.
const STATE_TONE: Record<SlotStateName, string> = {
  empty: 'text-steel-600',
  loaded: 'text-steel-500',
  charged: 'text-steel-400',
  primed: 'text-gold-400',
  fired: 'text-steel-500',
}

const LOCK_STATE: Record<SlotStateName, LockState> = {
  empty: 'empty',
  loaded: 'open',
  charged: 'charging',
  primed: 'primed',
  fired: 'spent',
}

export function ActionBar() {
  const state = useWorkbench(selectState)
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }
  return (
    <div className="flex gap-2 border-t border-steel-800 bg-steel-950/80 px-4 py-2" data-testid="action-bar">
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
  //
  // The pulse is reserved for the moment a dragged card is over the Slot —
  // transient, ended by the drop. It no longer says "this can fire": that is
  // carried by the ward ring closing and the tumblers seating into a shear
  // line, which are shape changes and do not breathe. A Primed Slot can sit
  // for rounds, and a persistent pulse would both fade its own text and
  // become furniture the eye edits out — the idle motion the interface
  // direction bans.
  const pulse = gated ? '' : 'wb-face-pulse'

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
      className={`wb-plate wb-plate-lg min-h-20 flex-1 py-2 text-left transition ${FOCUS_RING_CLASS} ${
        // A Slot is a raked oathsteel plate. Its state lives in the leading-edge
        // accent — the status channel every plate shares — and in the face:
        // gold when the Slot is live (Primed, or about to take a card), ember
        // when the incoming card would replace what is there, steel otherwise.
        incomingCardId !== null && incomingLegal
          ? incomingAction === 'Replace'
            ? `wb-face-steel wb-acc-ember ${pulse}`
            : `wb-face-steel wb-acc-gold ${pulse}`
          : canFire
            ? 'wb-face-steel wb-acc-gold'
            : stateName === 'primed'
              ? 'wb-face-steel wb-acc-gold'
              : stateName === 'fired'
                ? 'wb-face-dim wb-acc-none'
                : card
                  ? 'wb-face-steel wb-acc-none'
                  : 'wb-face-dim wb-acc-none opacity-80'
      } ${spotlit ? SPOTLIGHT_CLASS : ''} ${gated ? GATED_CLASS : ''}`}
    >
      {incomingAction !== null && (
        <span
          className={`absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
            !incomingLegal
              ? 'bg-steel-700 text-steel-400 line-through'
              : incomingAction === 'Replace'
                ? 'bg-ember-950 text-ember-100 ring-1 ring-ember-500'
                : 'bg-gold-400 text-gold-950'
          }`}
        >
          {incomingAction}
        </span>
      )}
      {card ? (
        <>
          <div className="flex items-center gap-1.5">
            {/* Keyed on the state so entering Primed remounts the head and the
                seat plays once, on that transition only. */}
            <LockHead key={stateName} state={LOCK_STATE[stateName]} className={`h-4 w-4 shrink-0 ${stateName === 'primed' ? 'wb-seat' : ''}`} />
            <span className={`min-w-0 flex-1 truncate text-xs font-bold ${stateName === 'fired' ? 'text-steel-400' : 'text-ceramic-200'}`}>{card.title}</span>
            <span className={`h-2 w-2 shrink-0 rounded-full ${windowDotClass(cardWindowSpeed(card))}`} aria-hidden="true" />
          </div>
          {/* Charge tumblers. Separate raked pins with gaps while charging;
              when the last one seats the gaps close and they read as one
              continuous bar — the shear line clear, the lock free to turn.
              Segmented becoming solid is a bigger perceptual change at this
              size than any shift of value, and it is what a lock does. */}
          <div className={`mt-1.5 flex items-center ${stateName === 'primed' || stateName === 'fired' ? 'gap-0' : 'gap-[3px]'}`} data-testid="charge-tumblers">
            {Array.from({ length: chargeCap }, (_, index) => (
              <span
                key={index}
                className={`h-[5px] w-3.5 -skew-x-[8deg] ${
                  index < slot.charges.length ? (stateName === 'fired' ? 'bg-gold-700' : 'bg-gold-400') : 'bg-steel-950 shadow-[inset_0_1px_0_rgba(0,0,0,0.6)]'
                }`}
              />
            ))}
          </div>
          <div className={`mt-1 text-[10px] font-semibold tracking-wide uppercase ${STATE_TONE[stateName]}`}>{STATE_LABEL[stateName]}</div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-2xl leading-none font-light text-steel-700" aria-hidden="true">
          +
        </div>
      )}
    </button>
  )
}

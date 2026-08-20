import { useCatalog } from '@/content/CatalogContext'
import { cardWindowSpeed, type Card } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { AdvanceControl } from './AdvanceControl'
import { UndoControl } from './UndoControl'
import { blocksTarget } from '../onboarding/firstTurnScript'
import { useFirstTurnStep } from '../onboarding/useFirstTurn'
import {
  readSlot,
  slotLabel,
  SLOT_STATE_LABEL,
  type SlotIncoming,
  type SlotReading,
  type SlotStateName,
  type SlotTone,
} from './slots'
import { keywordIcon } from '../common/keywordIcons'
import { slotDetail } from '../common/holdDetails'
import { useHold, type HoldDetail } from '../common/HoldPopover'
import { LockHead, type LockState } from '../common/icons'
import { FOCUS_RING_CLASS, GATED_CLASS, SPOTLIGHT_CLASS, windowDotClass } from '../common/theme'

// The persistent Action Bar. Each Slot shows its Top Card, its Charge Stack
// as pips, and its state as one colour — the rules text is a hold away. Tap
// a glowing Slot in its matching window to fire it; while a Compact Card is
// in hand, each Slot shows the word for what it would receive.
//
// Nothing in this file decides anything about a Slot. What state it is in,
// what an in-hand card would do to it, and which tone it wears are all read
// in one call to `readSlot`, which is where those rules are written down and
// tested. Here they are only spelled in Tailwind.

const EMPTY_SLOT_DETAIL: HoldDetail = {
  id: 'slot:empty',
  title: 'Empty Slot',
  tone: 'neutral',
  text: 'A Slot holds one Top Card for the rest of the Encounter, plus the Charge Stack tucked under it.',
  hint: 'Drag a card here, or tap the card then the Slot.',
}

// Which states print a state WORD under the pins. Loaded does not: a card
// sitting in the Slot already says it, and a word that only restates what the
// eye sees is noise the other states have to be read past. The label is kept
// for the aria-label, where the card's presence is not a visible fact.
//
// This governs the word, not the row. Since the want marks moved down, a
// Loaded Slot with an appetite renders that row for its marks alone — the
// argument above is untouched, because nothing is being said twice.
const SUBTITLE_STATES: ReadonlySet<SlotStateName> = new Set<SlotStateName>(['charged', 'full', 'fired'])

// Only Full wears gold in the label: it is the state that can fire.
// Fired is the state that cannot, and it must not borrow the live colour.
const STATE_TONE: Record<SlotStateName, string> = {
  empty: 'text-steel-600',
  loaded: 'text-steel-500',
  charged: 'text-steel-400',
  full: 'text-gold-400',
  fired: 'text-steel-500',
}

const LOCK_STATE: Record<SlotStateName, LockState> = {
  empty: 'empty',
  loaded: 'open',
  charged: 'charging',
  full: 'full',
  fired: 'spent',
}

// The six tones a plate can wear, in Tailwind. Which one applies is decided
// by `slotTone`; this is only the spelling, so a palette change lands here
// and a precedence change lands in slots.ts.
const TONE_FACE: Record<SlotTone, string> = {
  offer: 'wb-face-steel wb-acc-gold',
  'offer-replace': 'wb-face-steel wb-acc-ember',
  live: 'wb-face-steel wb-acc-gold',
  off: 'wb-face-dim wb-acc-none',
  loaded: 'wb-face-steel wb-acc-none',
  empty: 'wb-face-dim wb-acc-none opacity-80',
}

const OFFER_TONES: ReadonlySet<SlotTone> = new Set<SlotTone>(['offer', 'offer-replace'])

// The bar is a twelve-unit ladder: 2 | 4 | 4 | 2. The rails take two units
// each and the replaceable Slots share the eight between them. The Signature
// Slot never renders here — its face is the Hero Frame's control (D-065) —
// so the bar carries exactly the Slots a hand card can reach.
//
// The rails are why the ladder exists. Undo and the advance control are the
// two most-pressed things in the interface and both used to be somewhere
// else — advance parked in the phase strip at the top of the frame, undo
// only in the debug rail — which put the fight's pacing as far from the
// thumb as a portrait surface allows. A grid rather than a flex row because
// the ladder is the contract: the Slots must not resize when a rail changes
// what it is, and two fr-sized rails around two flex-1 Slots would do
// exactly that.
// Keyed by the units one Slot spans (Tailwind needs the literal class names).
const SLOT_SPAN: Record<number, string> = { 8: 'col-span-8', 4: 'col-span-4', 2: 'col-span-2' }

export function ActionBar() {
  const state = useWorkbench(selectState)
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }
  // px-2, not px-4: the ladder spends its width on four controls now, and
  // the eight units the Slots share have to carry a card title. Fixed Slots
  // are filtered, not hidden: the map below only ever mints plates for the
  // Slots a card can be dragged to.
  const replaceable = hero.actionBar.map((slot, slotIndex) => ({ slot, slotIndex })).filter(({ slot }) => !slot.fixed)
  const units = replaceable.length > 0 ? Math.floor(8 / replaceable.length) : 8
  const span = SLOT_SPAN[units] ?? 'col-span-4'
  return (
    <div className="grid grid-cols-12 gap-1.5 border-t border-steel-800 bg-steel-950/80 px-2 py-2" data-testid="action-bar">
      <UndoControl />
      {replaceable.map(({ slotIndex }) => (
        <Slot key={slotIndex} slotIndex={slotIndex} span={span} />
      ))}
      <AdvanceControl />
    </div>
  )
}

// What the in-hand card would do here, printed on the plate's shoulder. An
// illegal landing is struck through rather than hidden: the offer is what the
// player is holding, and the answer to it is the thing worth showing.
function IncomingBadge({ incoming }: { incoming: SlotIncoming }) {
  return (
    <span
      className={`absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
        !incoming.legal
          ? 'bg-steel-700 text-steel-400 line-through'
          : incoming.action === 'Replace'
            ? 'bg-ember-950 text-ember-100 ring-1 ring-ember-500'
            : 'bg-gold-400 text-gold-950'
      }`}
    >
      {incoming.action}
    </span>
  )
}

// Charge tumblers. Separate raked pins with gaps while charging; when the
// last one seats the gaps close and they read as one continuous bar — the
// shear line clear, the lock free to turn. Segmented becoming solid is a
// bigger perceptual change at this size than any shift of value, and it is
// what a lock does.
//
// The lock head and the timing dot flank the pins rather than the title. Four
// units of the ladder is about 120px, and the two marks took 36 of the ~96
// that leaves — enough to truncate "Steady Strike", which is a card the
// player is choosing between. Each mark sits with what it describes: a lock
// head with its own tumblers, the timing dot with the Keywords below.
function ChargeTumblers({ card, reading }: { card: Card; reading: SlotReading }) {
  const { stateName, chargeCap, chargeCount } = reading
  const seated = stateName === 'full' || stateName === 'fired'
  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      {/* Keyed on the state so entering Full remounts the head and the seat
          plays once, on that transition only. */}
      <LockHead key={stateName} state={LOCK_STATE[stateName]} className={`h-4 w-4 shrink-0 ${stateName === 'full' ? 'wb-seat' : ''}`} />
      <div className={`flex items-center ${seated ? 'gap-0' : 'gap-1'}`} data-testid="charge-tumblers">
        {Array.from({ length: chargeCap }, (_, index) => (
          <span
            key={index}
            className={`h-[5px] w-3.5 -skew-x-[8deg] ${
              index < chargeCount
                ? stateName === 'fired'
                  ? 'bg-gold-700'
                  : 'bg-gold-400'
                : 'bg-steel-950 shadow-[inset_0_1px_0_rgba(0,0,0,0.6)]'
            }`}
          />
        ))}
      </div>
      <span className={`ml-auto h-2 w-2 shrink-0 rounded-full ${windowDotClass(cardWindowSpeed(card))}`} aria-hidden="true" />
    </div>
  )
}

// The state word and the want marks share the row under the pins. Both are
// legible there, and neither fits above: a three-Charge Top Card carrying one
// want mark needed 106px of tumbler row inside a 97px Slot, which put the
// glyph in the plate's own cut — the defect the padding rule exists to
// prevent and cannot see, because it measures padding rather than content.
//
// What this Top Card is hunting for: the same Keyword marks the Hand draws,
// so the answer to "which card do I tuck here" is a match between two glyphs
// rather than a rules sentence either end. Gold while the Slot can still take
// a Charge — the same predicate that lights those Keywords in hand — and
// steel when it cannot, so a card's appetite stays learnable through the
// window it spends unable to act on it.
//
// Loaded still prints no word: a card sitting in the Slot already says it.
// That rule was always about the word, not the row, so a Loaded Slot with an
// appetite may borrow the row for its marks and one with none renders
// nothing, exactly as before.
function SlotSubtitle({ reading, heroId }: { reading: SlotReading; heroId: string }) {
  const { stateName, outOfWindow, wanted, takesCharge } = reading
  const printsWord = SUBTITLE_STATES.has(stateName)
  if (!printsWord && wanted.length === 0) {
    return null
  }
  return (
    <div className="mt-1 flex items-center gap-1.5">
      {printsWord && (
        // An out-of-window Slot's subtitle drops to steel whatever its state:
        // Full's gold word on a dim plate would still whisper "can fire", and
        // it cannot until its window comes round.
        <span className={`text-[10px] font-semibold tracking-wide uppercase ${outOfWindow ? 'text-steel-500' : STATE_TONE[stateName]}`}>
          {SLOT_STATE_LABEL[stateName]}
        </span>
      )}
      {wanted.length > 0 && (
        <div className="ml-auto flex shrink-0 items-center gap-1" data-testid="slot-wants">
          {wanted.map((keywordId) => {
            const Icon = keywordIcon(heroId, keywordId)
            return <Icon key={keywordId} className={`h-4 w-4 ${takesCharge ? 'text-gold-400' : 'text-steel-600'}`} />
          })}
        </div>
      )}
    </div>
  )
}

function Slot({ slotIndex, span }: { slotIndex: number; span: string }) {
  const state = useWorkbench(selectState)
  const catalog = useCatalog()
  const fireSlot = useWorkbench((store) => store.fireSlot)
  const cardDroppedOnSlot = useWorkbench((store) => store.cardDroppedOnSlot)
  const selectedCardId = useWorkbench((store) => store.selectedCardId)
  const draggingCardId = useWorkbench((store) => store.draggingCardId)
  const step = useFirstTurnStep()

  const slot = state.heroes[state.primaryHeroId].actionBar[slotIndex]
  const reading = readSlot(catalog, state, slot, slotIndex, selectedCardId ?? draggingCardId)
  const { card, stateName, canFire, outOfWindow, incoming, tone } = reading
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
  // line, which are shape changes and do not breathe. A Full Slot can sit for
  // rounds, and a persistent pulse would both fade its own text and become
  // furniture the eye edits out — the idle motion the interface direction
  // bans.
  const pulse = !gated && OFFER_TONES.has(tone) ? 'wb-face-pulse' : ''

  return (
    <button
      type="button"
      data-testid={`slot-${slotIndex}`}
      data-top-card={slot.topCard?.cardId ?? ''}
      data-charges={reading.chargeCount}
      data-slot-state={stateName}
      data-out-of-window={outOfWindow}
      data-incoming-action={incoming?.action ?? ''}
      data-incoming-legal={incoming === null ? '' : String(incoming.legal)}
      aria-label={slotLabel(catalog, reading, slotIndex)}
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
      className={`wb-plate wb-plate-slot ${span} min-h-20 min-w-0 py-2 text-left transition ${FOCUS_RING_CLASS} ${TONE_FACE[tone]} ${pulse} ${
        spotlit ? SPOTLIGHT_CLASS : ''
      } ${gated ? GATED_CLASS : ''}`}
    >
      {incoming !== null && <IncomingBadge incoming={incoming} />}
      {card ? (
        <>
          <span className={`block truncate text-xs font-bold ${stateName === 'fired' || outOfWindow ? 'text-steel-400' : 'text-ceramic-200'}`}>
            {card.title}
          </span>
          <ChargeTumblers card={card} reading={reading} />
          <SlotSubtitle reading={reading} heroId={state.primaryHeroId} />
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-2xl leading-none font-light text-steel-700" aria-hidden="true">
          +
        </div>
      )}
    </button>
  )
}

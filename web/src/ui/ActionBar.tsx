import { cardChargeCap, cardWindowSpeed, legality, type SlotState } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { AdvanceControl } from './AdvanceControl'
import { UndoControl } from './UndoControl'
import { blocksTarget } from './firstTurnScript'
import { useFirstTurnStep } from './useFirstTurn'
import { slotCanFire, slotOutOfWindow, slotTakesCharge, slotWantedKeywords } from './slots'
import { keywordIcon } from './keywordIcons'
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

type SlotStateName = 'empty' | 'loaded' | 'charged' | 'full' | 'fired'

function slotStateName(slot: SlotState, chargeCap: number): SlotStateName {
  if (slot.topCard === null) {
    return 'empty'
  }
  if (slot.activatedWindow !== null) {
    return 'fired'
  }
  if (slot.charges.length === chargeCap) {
    return 'full'
  }
  return slot.charges.length > 0 ? 'charged' : 'loaded'
}

const STATE_LABEL: Record<SlotStateName, string> = {
  empty: '',
  loaded: 'Loaded',
  charged: 'Charged',
  full: 'Full',
  fired: 'Fired',
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

function Slot({ slotIndex, span }: { slotIndex: number; span: string }) {
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
  const canFire = slotCanFire(catalog, state, slotIndex)
  // A Slot whose Top Card fires in the other window is off for this one: it
  // cannot fire however charged it is, so its plate goes dim rather than
  // sitting lit beside the Slot that can. Off, not dead — it still takes
  // Charge, so its want marks keep their own predicate and the plate lights
  // gold again the moment a card is in hand over it. The tumblers and the
  // timing dot stay at full tone on the dim face: the Charge is intact, and
  // the dot is the mark that says which window turns the Slot back on.
  const outOfWindow = slotOutOfWindow(catalog, state, slot)
  const wanted = slotWantedKeywords(catalog, slot)
  const takesCharge = slotTakesCharge(catalog, state, slot)
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
  // line, which are shape changes and do not breathe. A Full Slot can sit
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
      data-out-of-window={outOfWindow}
      data-incoming-action={incomingAction ?? ''}
      data-incoming-legal={incomingAction === null ? '' : String(incomingLegal)}
      aria-label={
        card
          ? `Slot ${slotIndex + 1}: ${card.title}, ${STATE_LABEL[stateName]}${
              outOfWindow ? `, fires in the ${cardWindowSpeed(card) === 'quick' ? 'Quick' : 'Slow'} Window` : ''
            }${
              // The want marks are the only thing on the plate with no word
              // beside them, so the label is where they are spoken.
              wanted.length > 0 && takesCharge
                ? `, takes ${wanted.map((keywordId) => catalog.keywords[keywordId]?.title ?? keywordId).join(' or ')} cards`
                : ''
            }`
          : `Slot ${slotIndex + 1}: empty`
      }
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
      className={`wb-plate wb-plate-slot ${span} min-h-20 min-w-0 py-2 text-left transition ${FOCUS_RING_CLASS} ${
        // A Slot is a raked oathsteel plate. Its state lives in the leading-edge
        // accent — the status channel every plate shares — and in the face:
        // gold when the Slot is live (Full, or about to take a card), ember
        // when the incoming card would replace what is there, steel otherwise.
        // A Slot waiting for the other window goes to the dim face before
        // Full is consulted: Full's gold says "can fire", which is the
        // one claim an out-of-window Slot must not make. The in-hand branch
        // stays above it — a card held over the bar is a Charge offer, and
        // charging is the move an off Slot still owns.
        incomingCardId !== null && incomingLegal
          ? incomingAction === 'Replace'
            ? `wb-face-steel wb-acc-ember ${pulse}`
            : `wb-face-steel wb-acc-gold ${pulse}`
          : canFire
            ? 'wb-face-steel wb-acc-gold'
            : outOfWindow
              ? 'wb-face-dim wb-acc-none'
              : stateName === 'full'
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
          {/* The title has the row to itself. Four units of the ladder is
              about 120px, and a lock head and a timing dot flanking the name
              took 36 of the ~96 that leaves — enough to truncate "Steady
              Strike", which is a card the player is choosing between. Both
              marks moved down to the row where they already belong: a lock
              head sits with its own tumblers, and the timing dot sits with
              the Keywords, which is the other half of "what does this Slot
              want and when". */}
          <span className={`block truncate text-xs font-bold ${stateName === 'fired' || outOfWindow ? 'text-steel-400' : 'text-ceramic-200'}`}>
            {card.title}
          </span>
          {/* Charge tumblers. Separate raked pins with gaps while charging;
              when the last one seats the gaps close and they read as one
              continuous bar — the shear line clear, the lock free to turn.
              Segmented becoming solid is a bigger perceptual change at this
              size than any shift of value, and it is what a lock does. */}
          <div className="mt-1.5 flex items-center gap-1.5">
            {/* Keyed on the state so entering Full remounts the head and the
                seat plays once, on that transition only. */}
            <LockHead key={stateName} state={LOCK_STATE[stateName]} className={`h-4 w-4 shrink-0 ${stateName === 'full' ? 'wb-seat' : ''}`} />
            <div className={`flex items-center ${stateName === 'full' || stateName === 'fired' ? 'gap-0' : 'gap-1'}`} data-testid="charge-tumblers">
              {Array.from({ length: chargeCap }, (_, index) => (
                <span
                  key={index}
                  className={`h-[5px] w-3.5 -skew-x-[8deg] ${
                    index < slot.charges.length ? (stateName === 'fired' ? 'bg-gold-700' : 'bg-gold-400') : 'bg-steel-950 shadow-[inset_0_1px_0_rgba(0,0,0,0.6)]'
                  }`}
                />
              ))}
            </div>
            <span className={`ml-auto h-2 w-2 shrink-0 rounded-full ${windowDotClass(cardWindowSpeed(card))}`} aria-hidden="true" />
          </div>
          {/* The state word and the want marks share the row under the pins.
              Both are legible there, and neither fits above: a three-Charge Top
              Card carrying one want mark needed 106px of tumbler row inside a
              97px Slot, which put the glyph in the plate's own cut — the defect
              the padding rule exists to prevent and cannot see, because it
              measures padding rather than content.

              What this Top Card is hunting for: the same Keyword marks the Hand
              draws, so the answer to "which card do I tuck here" is a match
              between two glyphs rather than a rules sentence either end. Gold
              while the Slot can still take a Charge — the same predicate that
              lights those Keywords in hand — and steel when it cannot, so a
              card's appetite stays learnable through the window it spends
              unable to act on it.

              Loaded still prints no word: a card sitting in the Slot already
              says it. That rule was always about the word, not the row, so a
              Loaded Slot with an appetite may borrow the row for its marks and
              one with none renders nothing, exactly as before. */}
          {(SUBTITLE_STATES.has(stateName) || wanted.length > 0) && (
            <div className="mt-1 flex items-center gap-1.5">
              {SUBTITLE_STATES.has(stateName) && (
                // An out-of-window Slot's subtitle drops to steel whatever its
                // state: Full's gold word on a dim plate would still whisper
                // "can fire", and it cannot until its window comes round.
                <span className={`text-[10px] font-semibold tracking-wide uppercase ${outOfWindow ? 'text-steel-500' : STATE_TONE[stateName]}`}>
                  {STATE_LABEL[stateName]}
                </span>
              )}
              {wanted.length > 0 && (
                <div className="ml-auto flex shrink-0 items-center gap-1" data-testid="slot-wants">
                  {wanted.map((keywordId) => {
                    const Icon = keywordIcon(state.primaryHeroId, keywordId)
                    return <Icon key={keywordId} className={`h-4 w-4 ${takesCharge ? 'text-gold-400' : 'text-steel-600'}`} />
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-2xl leading-none font-light text-steel-700" aria-hidden="true">
          +
        </div>
      )}
    </button>
  )
}

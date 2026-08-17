import { cardChargeCap, cardWindowSpeed } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { blocksTarget } from './firstTurnScript'
import { useFirstTurnStep } from './useFirstTurn'
import { handCanAct } from './slots'
import { CARD_EFFECT_TONE, cardEffect } from './icons'
import { cardDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { FOCUS_RING_CLASS, GATED_CLASS, SPOTLIGHT_CLASS, windowToneClass } from './theme'

// The Hand: equal Compact Cards anchored to the bottom interaction zone. A
// Compact Card carries a name, an effect colour, its window speed, and its
// Charge Value as pips — no rules text. Hold one to read the full card;
// tap (or focus and press Enter) to select it for the tap path.
function CompactCard({
  instanceId,
  cardId,
  spotlit,
  gated,
  width,
}: {
  instanceId: string
  cardId: string
  spotlit: boolean
  gated: boolean
  width: string
}) {
  const catalog = useWorkbench((store) => store.catalog)
  const setDraggingCard = useWorkbench((store) => store.setDraggingCard)
  const selectCard = useWorkbench((store) => store.selectCard)
  const selected = useWorkbench((store) => store.selectedCardId === instanceId)
  const card = catalog.cards[cardId]
  const hold = useHold(cardDetail(card, 'hand', 'Drop it on a Slot to prepare or charge it.'))
  const windowSpeed = cardWindowSpeed(card)
  const effectTone = CARD_EFFECT_TONE[cardEffect(card)]
  const EffectIcon = effectTone.icon

  return (
    <button
      type="button"
      draggable
      data-testid="hand-card"
      data-card-id={cardId}
      data-card-instance={instanceId}
      data-selected={selected}
      data-scripted={spotlit}
      {...hold.holdProps}
      onClick={() => {
        // A press that opened the detail popup is not a selection tap.
        if (!hold.consumeHold()) {
          selectCard(instanceId)
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', instanceId)
        event.dataTransfer.effectAllowed = 'move'
        setDraggingCard(instanceId)
      }}
      onDragEnd={() => setDraggingCard(null)}
      style={{ width }}
      className={`wb-plate wb-plate-card wb-face-steel min-h-24 shrink-0 cursor-grab py-1.5 text-left transition hover:-translate-y-1 active:cursor-grabbing ${FOCUS_RING_CLASS} ${
        // A Compact Card is a raked oathsteel plate. Its timing seam is drawn by
        // the card body below; selection lifts it and takes the gold accent.
        selected ? '-translate-y-1 wb-acc-gold ring-2 ring-gold-400' : 'wb-acc-none'
      } ${spotlit ? `wb-acc-gold ${SPOTLIGHT_CLASS}` : ''} ${gated ? GATED_CLASS : ''}`}
    >
      {/* A five-card Hand leaves each card 56px of content. The title takes
          all of it: sharing the row with the effect icon left 38px, and the
          longest card name in the catalogue ("Unyielding", 60px at 11px)
          overran that — first into the neighbouring plate, then into the
          icon. At 10px every catalogue word fits its own line, and
          break-words contains anything longer that arrives later. */}
      <div className="text-[10px] leading-tight font-bold break-words text-ceramic-100">{card.title}</div>
      {/* The speed word carries its own colour, so the tone dot that used to
          lead this row said nothing the word did not — dropping it is what
          makes room for the effect icon here. */}
      <div className={`mt-1 flex items-center gap-1 text-[9px] font-semibold uppercase ${windowToneClass(windowSpeed)}`}>
        {windowSpeed}
        <EffectIcon className={`ml-auto h-3.5 w-3.5 shrink-0 ${effectTone.text}`} />
      </div>
      <div className="mt-1.5 flex gap-0.5" role="img" aria-label={`Charge value ${cardChargeCap(card)}`}>
        {Array.from({ length: cardChargeCap(card) }, (_, index) => (
          <span key={index} className="h-1.5 w-3 rounded-full bg-steel-600" />
        ))}
      </div>
    </button>
  )
}

export function Hand() {
  const state = useWorkbench(selectState)
  const step = useFirstTurnStep()
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }
  // Two reasons a Hand goes quiet, and they compose. The scripted first turn
  // gates it while a step points elsewhere. And during a Boss row — Instant
  // or Incoming — no card in hand has a legal action, so the Hand recedes on
  // its own: the interface must not hold four cards at full brightness
  // through a phase in which every one of them is illegal. The band keeps
  // its height either way, because the board sizes to the space the HUD
  // leaves and must never resize mid-Encounter.
  const handGated = blocksTarget(step, 'hand') || !handCanAct(state)
  // A Compact Card keeps one width — its share of a full Hand — whether
  // five cards remain or one. Cards that stretched to fill the row stopped
  // reading as cards; a thinning Hand stays centered, with the freed space
  // splitting evenly to either side. The wrap only matters if a Hand ever
  // outgrows its refill target: extra cards start a second row instead of
  // overflowing.
  const slotCount = Math.max(hero.refillTarget, hero.hand.length, 1)
  // 0.25rem is the row's gap-1; change them together.
  const cardWidth = `calc((100% - ${(slotCount - 1) * 0.25}rem) / ${slotCount})`

  // min-h-30 reserves the full-hand row height (min-h-24 cards + py-3) even
  // as the Hand empties: the board above sizes to the space the HUD leaves,
  // and playing out the Hand must not make the board grow mid-Encounter.
  return (
    <div
      // px-2/gap-1 rather than px-3/gap-1.5: at a five-card refill the row's
      // own chrome was costing 16px of card width, and the widest card name
      // in the catalogue needs every one of them to sit on one line.
      className="flex min-h-30 flex-wrap content-center justify-center gap-1 border-t border-steel-800 bg-navy-950/90 px-2 py-3"
      data-testid="hand"
      data-inert={handCanAct(state) ? undefined : 'true'}
    >
      {hero.hand.map((instance) => {
        // The script points at one card at a time; the rest of the Hand
        // waits its turn.
        const scripted = step?.cardInstanceId ?? null
        const spotlit = !handGated && scripted === instance.instanceId
        const gated = handGated || (scripted !== null && scripted !== instance.instanceId)
        return (
          <CompactCard
            key={instance.instanceId}
            instanceId={instance.instanceId}
            cardId={instance.cardId}
            spotlit={spotlit}
            gated={gated}
            width={cardWidth}
          />
        )
      })}
      {hero.hand.length === 0 && <div className="flex-1 py-4 text-center text-xs text-steel-600">Hand is empty</div>}
    </div>
  )
}

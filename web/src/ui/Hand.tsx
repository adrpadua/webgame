import { cardChargeCap, cardWindowSpeed } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { blocksTarget } from './firstTurnScript'
import { useFirstTurnStep } from './useFirstTurn'
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
      className={`wb-plate wb-plate-md wb-face-steel min-h-24 shrink-0 cursor-grab py-1.5 text-left transition hover:-translate-y-1 active:cursor-grabbing ${FOCUS_RING_CLASS} ${
        // A Compact Card is a raked oathsteel plate. Its timing seam is drawn by
        // the card body below; selection lifts it and takes the gold accent.
        selected ? '-translate-y-1 wb-acc-gold ring-2 ring-gold-400' : 'wb-acc-none'
      } ${spotlit ? `wb-acc-gold ${SPOTLIGHT_CLASS}` : ''} ${gated ? GATED_CLASS : ''}`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="text-[11px] leading-tight font-bold text-zinc-50">{card.title}</div>
        <EffectIcon className={`h-3.5 w-3.5 shrink-0 ${effectTone.text}`} />
      </div>
      <div className={`mt-1 flex items-center gap-1 text-[9px] font-semibold uppercase ${windowToneClass(windowSpeed)}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {windowSpeed}
      </div>
      <div className="mt-1.5 flex gap-0.5" role="img" aria-label={`Charge value ${cardChargeCap(card)}`}>
        {Array.from({ length: cardChargeCap(card) }, (_, index) => (
          <span key={index} className="h-1.5 w-3 rounded-full bg-zinc-600" />
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
  const handGated = blocksTarget(step, 'hand')
  // A Compact Card keeps one width — its share of a full Hand — whether
  // five cards remain or one. Cards that stretched to fill the row stopped
  // reading as cards; a thinning Hand stays centered, with the freed space
  // splitting evenly to either side. The wrap only matters if a Hand ever
  // outgrows its refill target: extra cards start a second row instead of
  // overflowing.
  const slotCount = Math.max(hero.refillTarget, hero.hand.length, 1)
  // 0.375rem is the row's gap-1.5; change them together.
  const cardWidth = `calc((100% - ${(slotCount - 1) * 0.375}rem) / ${slotCount})`

  // min-h-30 reserves the full-hand row height (min-h-24 cards + py-3) even
  // as the Hand empties: the board above sizes to the space the HUD leaves,
  // and playing out the Hand must not make the board grow mid-Encounter.
  return (
    <div
      className="flex min-h-30 flex-wrap content-center justify-center gap-1.5 border-t border-zinc-800 bg-zinc-950/90 px-3 py-3"
      data-testid="hand"
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
      {hero.hand.length === 0 && <div className="flex-1 py-4 text-center text-xs text-zinc-600">Hand is empty</div>}
    </div>
  )
}

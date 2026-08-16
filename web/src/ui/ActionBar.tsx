import { cardChargeCap, cardWindowSpeed, legality } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { FOCUS_RING_CLASS, windowToneClass } from './theme'

// The persistent Action Bar: each Slot shows its Top Card, Charge Stack, and
// window state. Tap a charged Slot in its matching window to activate it;
// while a Compact Card is in hand (dragged or selected), each Slot shows the
// action it would receive — Prepare, Charge, or Replace — before you commit.
export function ActionBar() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const fireSlot = useWorkbench((store) => store.fireSlot)
  const cardDroppedOnSlot = useWorkbench((store) => store.cardDroppedOnSlot)
  const selectedCardId = useWorkbench((store) => store.selectedCardId)
  const draggingCardId = useWorkbench((store) => store.draggingCardId)
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }
  const incomingCardId = selectedCardId ?? draggingCardId

  return (
    <div className="flex gap-2 border-t border-zinc-800 bg-zinc-900/80 px-4 py-2" data-testid="action-bar">
      {hero.actionBar.map((slot, slotIndex) => {
        const card = slot.topCard ? catalog.cards[slot.topCard.cardId] : null
        const chargeCap = card ? cardChargeCap(card) : 0
        const primed = card !== null && slot.charges.length === chargeCap && slot.activatedWindow === null
        const fired = slot.activatedWindow !== null
        const windowSpeed = card ? cardWindowSpeed(card) : null
        const canFire = card !== null && slot.charges.length > 0 && !fired && windowSpeed === state.phase && state.active

        // What would landing the in-hand card here do, and is it legal?
        let incomingAction: 'Prepare' | 'Charge' | 'Replace' | null = null
        let incomingLegal = false
        if (incomingCardId !== null) {
          incomingAction = slot.topCard === null ? 'Prepare' : state.phase === 'loadout' ? 'Replace' : 'Charge'
          const kind = incomingAction === 'Charge' ? 'charge_slot' : 'load_slot'
          incomingLegal = legality(catalog, state, {
            kind,
            sourceId: state.primaryHeroId,
            slotIndex,
            cardInstanceId: incomingCardId,
          }).legal
        }

        return (
          <button
            key={slotIndex}
            type="button"
            data-testid={`slot-${slotIndex}`}
            data-top-card={slot.topCard?.cardId ?? ''}
            data-charges={slot.charges.length}
            data-incoming-action={incomingAction ?? ''}
            onClick={() => {
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
                  ? 'animate-pulse border-amber-400 bg-amber-950/50'
                  : 'animate-pulse border-emerald-400 bg-emerald-950/50'
                : canFire
                  ? 'animate-pulse border-emerald-500 bg-emerald-950/60 hover:bg-emerald-900/60'
                  : primed
                    ? 'border-amber-500 bg-amber-950/40'
                    : card
                      ? 'border-zinc-600 bg-zinc-800/70'
                      : 'border-dashed border-zinc-700 bg-zinc-900/40'
            }`}
          >
            {incomingAction !== null && incomingLegal && (
              <span
                className={`absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                  incomingAction === 'Replace' ? 'bg-amber-500 text-amber-950' : 'bg-emerald-500 text-emerald-950'
                }`}
              >
                {incomingAction}
              </span>
            )}
            {card ? (
              <>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs font-bold text-zinc-100">{card.title}</span>
                  <span className={`text-[9px] font-semibold uppercase ${windowToneClass(windowSpeed as 'quick' | 'slow')}`}>
                    {windowSpeed}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  {Array.from({ length: chargeCap }, (_, index) => (
                    <span
                      key={index}
                      className={`h-2.5 w-2.5 rounded-full ${index < slot.charges.length ? 'bg-amber-400' : 'bg-zinc-700'}`}
                    />
                  ))}
                  <span className="ml-1 text-[10px] text-zinc-400">
                    {slot.charges.length}/{chargeCap}
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-zinc-500">
                  {fired ? `Activated (${slot.activatedWindow})` : primed ? 'Primed' : slot.charges.length > 0 ? 'Charged' : 'Loaded'}
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-[11px] text-zinc-600">
                {incomingCardId !== null ? 'Place here to prepare' : 'Drag or tap a card to prepare'}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

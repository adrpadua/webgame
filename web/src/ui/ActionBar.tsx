import { cardChargeCap, cardWindowSpeed } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'

// The persistent Action Bar: each Slot shows its Top Card, Charge Stack, and
// window state. Tap a charged Slot in its matching window to activate it.
export function ActionBar() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const fireSlot = useWorkbench((store) => store.fireSlot)
  const cardDroppedOnSlot = useWorkbench((store) => store.cardDroppedOnSlot)
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }
  return (
    <div className="flex gap-2 border-t border-zinc-800 bg-zinc-900/80 px-4 py-2" data-testid="action-bar">
      {hero.actionBar.map((slot, slotIndex) => {
        const card = slot.topCard ? catalog.cards[slot.topCard.cardId] : null
        const chargeCap = card ? cardChargeCap(card) : 0
        const primed = card !== null && slot.charges.length === chargeCap && slot.activatedWindow === ''
        const fired = slot.activatedWindow !== ''
        const window = card ? cardWindowSpeed(card) : null
        const canFire = card !== null && slot.charges.length > 0 && !fired && window === state.phase && state.active
        return (
          <button
            key={slotIndex}
            type="button"
            data-testid={`slot-${slotIndex}`}
            data-top-card={slot.topCard?.cardId ?? ''}
            data-charges={slot.charges.length}
            onClick={() => {
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
            className={`min-h-20 flex-1 rounded-xl border-2 p-2 text-left transition ${
              canFire
                ? 'border-emerald-500 bg-emerald-950/60 hover:bg-emerald-900/60'
                : primed
                  ? 'border-amber-500 bg-amber-950/40'
                  : card
                    ? 'border-zinc-600 bg-zinc-800/70'
                    : 'border-dashed border-zinc-700 bg-zinc-900/40'
            }`}
          >
            {card ? (
              <>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-xs font-bold text-zinc-100">{card.title}</span>
                  <span className={`text-[9px] font-semibold uppercase ${window === 'quick' ? 'text-emerald-400' : 'text-sky-400'}`}>
                    {window}
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
              <div className="flex h-full items-center justify-center text-[11px] text-zinc-600">Drag a card to prepare</div>
            )}
          </button>
        )
      })}
    </div>
  )
}

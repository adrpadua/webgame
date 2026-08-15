import { cardChargeCap, cardWindowSpeed } from '@/engine'
import { useWorkbench } from '@/store/workbench'

// The Hand: four equal Compact Cards anchored to the bottom interaction zone.
// A Compact Card shows its name, timing, and Charge Value.
export function Hand() {
  const state = useWorkbench((store) => store.state)
  const catalog = useWorkbench((store) => store.catalog)
  const setDraggingCard = useWorkbench((store) => store.setDraggingCard)
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }
  return (
    <div className="flex gap-2 border-t border-zinc-800 bg-zinc-950/90 px-4 py-3" data-testid="hand">
      {hero.hand.map((instance) => {
        const card = catalog.cards[instance.cardId]
        const window = cardWindowSpeed(card)
        return (
          <div
            key={instance.instanceId}
            draggable
            data-testid="hand-card"
            data-card-id={instance.cardId}
            data-card-instance={instance.instanceId}
            title={card.rules_text}
            onDragStart={(event) => {
              event.dataTransfer.setData('text/plain', instance.instanceId)
              event.dataTransfer.effectAllowed = 'move'
              setDraggingCard(instance.instanceId)
            }}
            onDragEnd={() => setDraggingCard(null)}
            className="min-h-24 flex-1 cursor-grab rounded-xl border border-zinc-600 bg-linear-to-b from-zinc-700 to-zinc-800 p-2 shadow-md transition hover:-translate-y-1 hover:border-zinc-400 active:cursor-grabbing"
          >
            <div className="text-[11px] leading-tight font-bold text-zinc-50">{card.title}</div>
            <div className={`mt-1 text-[9px] font-semibold uppercase ${window === 'quick' ? 'text-emerald-400' : 'text-sky-400'}`}>
              {window}
            </div>
            <div className="mt-1 text-[9px] text-zinc-400">Charge {cardChargeCap(card)}</div>
          </div>
        )
      })}
      {hero.hand.length === 0 && <div className="flex-1 py-4 text-center text-xs text-zinc-600">Hand is empty</div>}
    </div>
  )
}

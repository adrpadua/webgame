import { useRef, useState } from 'react'
import { cardChargeCap, cardWindowSpeed, type Card } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { FOCUS_RING_CLASS, windowToneClass } from './theme'

// Card Inspection: the temporary full-card view shown while a player holds a
// Compact Card; it dismisses on release. Full art is the shared placeholder
// until per-card art is authored.
function CardInspection({ card }: { card: Card }) {
  const windowSpeed = cardWindowSpeed(card)
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-36 z-30" data-testid="card-inspection">
      <div className="rounded-2xl border-2 border-zinc-500 bg-zinc-900 p-4 shadow-2xl">
        <div className="flex items-baseline justify-between">
          <span className="text-base font-bold text-zinc-50">{card.title}</span>
          <span className={`text-[10px] font-semibold uppercase ${windowToneClass(windowSpeed)}`}>
            {windowSpeed} · Charge {cardChargeCap(card)}
          </span>
        </div>
        <div className="mt-2 flex h-24 items-center justify-center rounded-lg bg-linear-to-br from-zinc-700 via-zinc-800 to-zinc-900 text-[10px] tracking-widest text-zinc-500 uppercase">
          Placeholder art
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-200">{card.rules_text}</p>
        <div className="mt-2 flex gap-1">
          {card.tags.map((tag) => (
            <span key={tag} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400 uppercase">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// The Hand: four equal Compact Cards anchored to the bottom interaction zone.
// A Compact Card shows its name, timing, and Charge Value. Hold one to
// inspect it; tap (or focus and press Enter) to select it for the tap path —
// the next tapped Slot or move destination receives it.
export function Hand() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const setDraggingCard = useWorkbench((store) => store.setDraggingCard)
  const selectCard = useWorkbench((store) => store.selectCard)
  const selectedCardId = useWorkbench((store) => store.selectedCardId)
  const [inspectingCardId, setInspectingCardId] = useState<string | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inspectionWasShown = useRef(false)
  const hero = state.heroes[state.primaryHeroId]
  if (!hero) {
    return null
  }

  const beginHold = (cardId: string) => {
    inspectionWasShown.current = false
    holdTimer.current = setTimeout(() => {
      inspectionWasShown.current = true
      setInspectingCardId(cardId)
    }, 400)
  }
  const endHold = () => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    setInspectingCardId(null)
  }

  return (
    <>
      <div className="flex gap-2 border-t border-zinc-800 bg-zinc-950/90 px-4 py-3" data-testid="hand">
        {hero.hand.map((instance) => {
          const card = catalog.cards[instance.cardId]
          const windowSpeed = cardWindowSpeed(card)
          const selected = selectedCardId === instance.instanceId
          return (
            <button
              key={instance.instanceId}
              type="button"
              draggable
              data-testid="hand-card"
              data-card-id={instance.cardId}
              data-card-instance={instance.instanceId}
              data-selected={selected}
              onPointerDown={() => beginHold(instance.instanceId)}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onPointerCancel={endHold}
              onClick={() => {
                // A hold that showed Card Inspection is not a selection tap.
                if (!inspectionWasShown.current) {
                  selectCard(instance.instanceId)
                }
                inspectionWasShown.current = false
              }}
              onDragStart={(event) => {
                endHold()
                event.dataTransfer.setData('text/plain', instance.instanceId)
                event.dataTransfer.effectAllowed = 'move'
                setDraggingCard(instance.instanceId)
              }}
              onDragEnd={() => setDraggingCard(null)}
              className={`min-h-24 flex-1 cursor-grab rounded-xl border p-2 text-left shadow-md transition hover:-translate-y-1 active:cursor-grabbing ${FOCUS_RING_CLASS} ${
                selected
                  ? '-translate-y-1 border-emerald-400 bg-linear-to-b from-emerald-900/60 to-zinc-800 ring-2 ring-emerald-400'
                  : 'border-zinc-600 bg-linear-to-b from-zinc-700 to-zinc-800 hover:border-zinc-400'
              }`}
            >
              <div className="text-[11px] leading-tight font-bold text-zinc-50">{card.title}</div>
              <div className={`mt-1 text-[9px] font-semibold uppercase ${windowToneClass(windowSpeed)}`}>{windowSpeed}</div>
              <div className="mt-1 text-[9px] text-zinc-400">Charge {cardChargeCap(card)}</div>
            </button>
          )
        })}
        {hero.hand.length === 0 && <div className="flex-1 py-4 text-center text-xs text-zinc-600">Hand is empty</div>}
      </div>
      {inspectingCardId !== null &&
        (() => {
          const inspecting = hero.hand.find((instance) => instance.instanceId === inspectingCardId)
          return inspecting ? <CardInspection card={catalog.cards[inspecting.cardId]} /> : null
        })()}
    </>
  )
}

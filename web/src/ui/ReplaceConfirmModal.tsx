import { useEffect } from 'react'
import { selectState, useWorkbench } from '@/store/workbench'
import { FOCUS_RING_CLASS } from './theme'

// Slot Replacement is the one gesture that destroys player state (the old
// Top Card and its whole Charge Stack are discarded), so it always confirms.
export function ReplaceConfirmModal() {
  const pendingReplacement = useWorkbench((store) => store.pendingReplacement)
  const confirmReplacement = useWorkbench((store) => store.confirmReplacement)
  const cancelReplacement = useWorkbench((store) => store.cancelReplacement)
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)

  useEffect(() => {
    if (pendingReplacement === null) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelReplacement()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingReplacement, cancelReplacement])

  if (pendingReplacement === null) {
    return null
  }
  const hero = state.heroes[state.primaryHeroId]
  const slot = hero.actionBar[pendingReplacement.slotIndex]
  const oldCard = slot.topCard ? catalog.cards[slot.topCard.cardId] : null
  const newInstance = hero.hand.find((card) => card.instanceId === pendingReplacement.cardInstanceId)
  const newCard = newInstance ? catalog.cards[newInstance.cardId] : null
  const chargeCount = slot.charges.length
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-zinc-950/70 p-6" data-testid="replace-confirm">
      <div role="dialog" aria-modal="true" aria-labelledby="replace-confirm-title" className="w-full rounded-2xl border-2 border-amber-500 bg-zinc-900 p-4 shadow-2xl">
        <h2 id="replace-confirm-title" className="text-sm font-bold text-amber-300">
          Replace this Slot?
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-200">
          Replacing discards <span className="font-bold">{oldCard?.title ?? 'the Top Card'}</span>
          {chargeCount > 0 && (
            <>
              {' '}
              and its <span className="font-bold">{chargeCount}</span> charged card{chargeCount === 1 ? '' : 's'}
            </>
          )}
          , then loads <span className="font-bold">{newCard?.title ?? 'the chosen card'}</span> at 0 Charge.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            autoFocus
            data-testid="cancel-replace"
            onClick={cancelReplacement}
            className={`min-h-12 flex-1 rounded-lg bg-zinc-700 text-sm font-bold text-zinc-100 transition hover:bg-zinc-600 ${FOCUS_RING_CLASS}`}
          >
            Keep the Slot
          </button>
          <button
            type="button"
            data-testid="confirm-replace"
            onClick={confirmReplacement}
            className={`min-h-12 flex-1 rounded-lg bg-amber-600 text-sm font-bold text-white transition hover:bg-amber-500 ${FOCUS_RING_CLASS}`}
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  )
}

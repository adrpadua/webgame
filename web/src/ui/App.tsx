import { useEffect } from 'react'
import { PhaserBoard } from '@/board/PhaserBoard'
import { axialAdd, axialDeltaFor, facingName, isLegalMove, VALID_FACINGS } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { ActionBar } from './ActionBar'
import { DebugRail } from './DebugRail'
import { Hand } from './Hand'
import { PhaseControl } from './PhaseControl'
import { PlayerPanel } from './PlayerPanel'
import { ProgramStrip } from './ProgramStrip'
import { TopBar } from './TopBar'
import { FOCUS_RING_CLASS, FRAME_HEIGHT_CLASS } from './theme'

function RejectionToast() {
  const lastRejection = useWorkbench((store) => store.lastRejection)
  const clearRejection = useWorkbench((store) => store.clearRejection)
  useEffect(() => {
    if (lastRejection === null) {
      return
    }
    const timer = setTimeout(clearRejection, 3500)
    return () => clearTimeout(timer)
  }, [lastRejection, clearRejection])
  if (lastRejection === null) {
    return null
  }
  return (
    <div className="pointer-events-none absolute right-3 bottom-40 left-3 z-10" data-testid="rejection-toast">
      <div className="rounded-lg border border-red-800 bg-red-950/95 px-3 py-2 text-center text-xs font-semibold text-red-200 shadow-lg">
        {lastRejection}
      </div>
    </div>
  )
}

function TargetingBanner() {
  const targetingSlotIndex = useWorkbench((store) => store.targetingSlotIndex)
  const cancelTargeting = useWorkbench((store) => store.cancelTargeting)
  if (targetingSlotIndex === null) {
    return null
  }
  return (
    <div className="absolute top-40 right-3 left-3 z-10" data-testid="targeting-banner">
      <div className="flex items-center justify-between rounded-lg border border-yellow-700 bg-yellow-950/95 px-3 py-2 text-xs font-semibold text-yellow-200 shadow-lg">
        <span>Select a Minion on the board</span>
        <button
          type="button"
          onClick={cancelTargeting}
          className={`pointer-events-auto min-h-11 rounded-lg bg-yellow-800 px-4 font-bold text-yellow-100 ${FOCUS_RING_CLASS}`}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// Slot Replacement is the one gesture that destroys player state (the old
// Top Card and its whole Charge Stack are discarded), so it always confirms.
function ReplaceConfirmModal() {
  const pendingReplacement = useWorkbench((store) => store.pendingReplacement)
  const confirmReplacement = useWorkbench((store) => store.confirmReplacement)
  const cancelReplacement = useWorkbench((store) => store.cancelReplacement)
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
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
      <div className="w-full rounded-2xl border-2 border-amber-500 bg-zinc-900 p-4 shadow-2xl">
        <h2 className="text-sm font-bold text-amber-300">Replace this Slot?</h2>
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

// Keyboard- and tap-accessible movement: with a Compact Card selected during
// the Quick Window, one labeled button per legal hex edge moves the Hero
// (discarding the selected card for 1 Stamina), mirroring drag-card-to-hex.
function MovePad() {
  const state = useWorkbench(selectState)
  const selectedCardId = useWorkbench((store) => store.selectedCardId)
  const cardDroppedOnHex = useWorkbench((store) => store.cardDroppedOnHex)
  if (selectedCardId === null || state.phase !== 'quick' || !state.active) {
    return null
  }
  const heroEntity = state.board.entities[state.primaryHeroId]
  if (!heroEntity) {
    return null
  }
  return (
    <div className="absolute right-0 bottom-1 left-0 z-10 flex justify-center gap-1" data-testid="move-pad">
      {VALID_FACINGS.map((direction) => {
        const destination = axialAdd(heroEntity.coords, axialDeltaFor(direction))
        const legal = isLegalMove(state.board, state.primaryHeroId, destination)
        return (
          <button
            key={direction}
            type="button"
            disabled={!legal}
            data-testid={`move-${facingName(direction)}`}
            onClick={() => cardDroppedOnHex(selectedCardId, destination)}
            className={`min-h-11 min-w-11 rounded-lg border text-xs font-bold transition ${FOCUS_RING_CLASS} ${
              legal
                ? 'animate-pulse border-emerald-500 bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900/80'
                : 'border-zinc-800 bg-zinc-900/70 text-zinc-700'
            }`}
          >
            {facingName(direction)}
          </button>
        )
      })}
    </div>
  )
}

function OutcomeBanner() {
  const state = useWorkbench(selectState)
  if (state.active) {
    return null
  }
  const victory = state.outcome === 'victory'
  return (
    <div className="absolute inset-x-3 top-1/3 z-20" data-testid="outcome-banner" data-outcome={state.outcome}>
      <div
        className={`rounded-2xl border-2 px-4 py-6 text-center shadow-2xl ${
          victory ? 'border-emerald-500 bg-emerald-950/95 text-emerald-100' : 'border-red-600 bg-red-950/95 text-red-100'
        }`}
      >
        <div className="text-2xl font-black tracking-widest uppercase">{victory ? 'Victory' : 'Defeat'}</div>
        <div className="mt-2 text-sm">{state.outcomeReason}</div>
      </div>
    </div>
  )
}

export default function App() {
  // flex-wrap keeps the portrait frame and the debug rail side by side on
  // wide screens and stacks the rail below on narrow ones (iPad portrait).
  return (
    <div className="flex min-h-screen flex-wrap content-start items-start justify-center gap-6 bg-zinc-950 p-4 font-sans text-zinc-100 sm:p-6">
      <main
        className={`relative flex ${FRAME_HEIGHT_CLASS} w-[420px] max-w-full shrink-0 touch-manipulation flex-col overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl select-none`}
        data-testid="play-surface"
      >
        <TopBar />
        <ProgramStrip />
        <PhaseControl />
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          <PhaserBoard />
          <MovePad />
        </div>
        <PlayerPanel />
        <ActionBar />
        <Hand />
        <RejectionToast />
        <TargetingBanner />
        <ReplaceConfirmModal />
        <OutcomeBanner />
      </main>
      <DebugRail />
    </div>
  )
}

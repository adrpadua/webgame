import { useEffect } from 'react'
import { PhaserBoard } from '@/board/PhaserBoard'
import { useWorkbench } from '@/store/workbench'
import { ActionBar } from './ActionBar'
import { DebugRail } from './DebugRail'
import { Hand } from './Hand'
import { PhaseControl } from './PhaseControl'
import { PlayerPanel } from './PlayerPanel'
import { ProgramStrip } from './ProgramStrip'
import { TopBar } from './TopBar'

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
        <button type="button" onClick={cancelTargeting} className="pointer-events-auto rounded bg-yellow-800 px-2 py-1 text-yellow-100">
          Cancel
        </button>
      </div>
    </div>
  )
}

function OutcomeBanner() {
  const state = useWorkbench((store) => store.state)
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
  return (
    <div className="flex min-h-screen items-start justify-center gap-6 bg-zinc-950 p-6 font-sans text-zinc-100">
      <main
        className="relative flex h-[840px] w-[420px] shrink-0 flex-col overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        data-testid="play-surface"
      >
        <TopBar />
        <ProgramStrip />
        <PhaseControl />
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <PhaserBoard />
        </div>
        <PlayerPanel />
        <ActionBar />
        <Hand />
        <RejectionToast />
        <TargetingBanner />
        <OutcomeBanner />
      </main>
      <DebugRail />
    </div>
  )
}

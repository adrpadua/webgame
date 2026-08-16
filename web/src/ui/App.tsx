import { useEffect } from 'react'
import { PhaserBoard } from '@/board/PhaserBoard'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'
import { BossEmblem, HeroEmblem } from './icons'
import { ActionBar } from './ActionBar'
import { CoachMark } from './CoachMark'
import { DebugRail } from './DebugRail'
import { FirstTurnCue } from './FirstTurnCue'
import { GuideModal } from './GuideModal'
import { Hand } from './Hand'
import { HoldPopoverLayer } from './HoldPopover'
import { MovePad } from './MovePad'
import { PhaseBanner } from './PhaseBanner'
import { PhaseControl } from './PhaseControl'
import { PlayerPanel } from './PlayerPanel'
import { ProgramStrip } from './ProgramStrip'
import { ReplaceConfirmModal } from './ReplaceConfirmModal'
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

// The boss turn's pacing control: while the playout waits between beats,
// one amber bar over the board's lower edge names the beat that just
// played and hands the player the next one. The rules already resolved the
// whole track — this only paces the telling.
function PlayoutContinue() {
  const awaiting = usePlayout((store) => store.awaitingContinue)
  const beatTitle = usePlayout((store) => store.activeBeatTitle)
  const continuePlayout = usePlayout((store) => store.continuePlayout)
  if (!awaiting) {
    return null
  }
  return (
    <div className="absolute inset-x-2 bottom-2 z-10">
      <button
        type="button"
        data-testid="playout-continue"
        onClick={continuePlayout}
        className={`wb-slide-up flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border-2 border-amber-500 bg-amber-950/95 px-4 text-left shadow-xl ${FOCUS_RING_CLASS}`}
      >
        <span className="text-xs font-bold text-amber-100">{beatTitle ?? 'Boss beat'}</span>
        <span className="animate-pulse text-xs font-black tracking-widest text-amber-300 uppercase motion-reduce:animate-none">
          Continue ▸
        </span>
      </button>
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
        <span>Pick a Minion</span>
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

function OutcomeBanner() {
  const state = useWorkbench(selectState)
  // The batch that ended the Encounter may still be replaying beat by beat;
  // the reveal waits for the fatal blow to land on screen.
  const outcomeHeld = usePlayout((store) => store.outcomeHeld)
  if (state.active || outcomeHeld) {
    return null
  }
  const victory = state.outcome === 'victory'
  return (
    <div className="absolute inset-x-3 top-1/3 z-20" data-testid="outcome-banner" data-outcome={state.outcome}>
      <div
        className={`wb-pop-in rounded-2xl border-2 px-4 py-6 text-center shadow-2xl ${
          victory ? 'border-emerald-500 bg-emerald-950/95 text-emerald-100' : 'border-red-600 bg-red-950/95 text-red-100'
        }`}
      >
        {victory ? (
          <HeroEmblem className="wb-float mx-auto h-12 w-12 text-emerald-400" />
        ) : (
          <BossEmblem className="wb-float mx-auto h-12 w-12 text-red-500" />
        )}
        <div className="mt-2 text-2xl font-black tracking-widest uppercase">{victory ? 'Victory' : 'Defeat'}</div>
        <div className="mt-2 text-sm">{state.outcomeReason}</div>
      </div>
    </div>
  )
}

export default function App() {
  // flex-wrap keeps the portrait frame and the debug rail side by side on
  // wide screens and stacks the rail below on narrow ones (iPad portrait).
  // On phones (below `sm`) the frame goes edge to edge — no page padding, no
  // rounded border — and pads itself with the safe-area insets so the Boss
  // line and the Hand clear the notch and the home indicator under
  // viewport-fit=cover. The rail still stacks below, one scroll away.
  return (
    <div className="flex min-h-dvh flex-wrap content-start items-start justify-center bg-zinc-950 font-sans text-zinc-100 sm:gap-6 sm:p-6">
      <main
        className={`relative flex ${FRAME_HEIGHT_CLASS} w-full max-w-full shrink-0 touch-manipulation flex-col overflow-hidden bg-zinc-900 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl select-none sm:w-[420px] sm:rounded-3xl sm:border sm:border-zinc-700`}
        data-testid="play-surface"
      >
        <TopBar />
        <ProgramStrip />
        <PhaseControl />
        {/* overflow-hidden: the fixed-size Phaser canvas centers here and must
            clip, never spill over (or steal pointer events from) the HUD. */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <PhaserBoard />
          <MovePad />
          <PlayoutContinue />
        </div>
        <FirstTurnCue />
        <CoachMark />
        <PlayerPanel />
        <ActionBar />
        <Hand />
        <RejectionToast />
        <TargetingBanner />
        <PhaseBanner />
        <ReplaceConfirmModal />
        <OutcomeBanner />
        <GuideModal />
      </main>
      <DebugRail />
      {/* One popup surface for every tap-and-hold on the page. */}
      <HoldPopoverLayer />
    </div>
  )
}

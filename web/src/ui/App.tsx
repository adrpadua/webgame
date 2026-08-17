import { useEffect } from 'react'
import { PhaserBoard } from '@/board/PhaserBoard'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'
import { BossEmblem, HeroEmblem } from './icons'
import { ActionBar } from './ActionBar'
import { CoachMark } from './CoachMark'
import { DebugRail } from './DebugRail'

const showDebugRail = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')
import { EntityInspect } from './EntityInspect'
import { FirstTurnCue } from './FirstTurnCue'
import { GuideModal } from './GuideModal'
import { Hand } from './Hand'
import { HoldPopoverLayer } from './HoldPopover'
import { MovePad } from './MovePad'
import { MovePaymentCue } from './MovePaymentCue'
import { PhaseBanner } from './PhaseBanner'
import { PhaseControl } from './PhaseControl'
import { ProgramStrip } from './ProgramStrip'
import { ReplaceConfirmModal } from './ReplaceConfirmModal'
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
      <div className="wb-plate wb-plate-sm wb-face-steel wb-acc-ember py-2 text-center text-xs font-semibold text-ember-100">
        {lastRejection}
      </div>
    </div>
  )
}

// The playout's pacing control: one amber bar names the beat the press will
// play and hands it to the player. The bar is a trailer, not a caption — it
// names what is about to happen, because "Raking Claw · Continue" reads as a
// promise to show the claw, and naming the beat already on the board made
// every press look like it skipped one. Every beat of a Boss Row gets its
// own press, the opening one included, so the bar is the first thing the Row
// says. What has already resolved stays readable beside it: those Boss Beat
// chips keep their light until the next moment fires. The rules already
// resolved the whole track — this only paces the telling.
function PlayoutContinue() {
  const awaiting = usePlayout((store) => store.awaitingContinue)
  const nextBeatTitle = usePlayout((store) => store.nextBeatTitle)
  const continuePlayout = usePlayout((store) => store.continuePlayout)
  if (!awaiting) {
    return null
  }
  return (
    <button
      type="button"
      data-testid="playout-continue"
      data-next-beat={nextBeatTitle ?? ''}
      onClick={continuePlayout}
      className={`wb-slide-up wb-face-pulse pointer-events-auto wb-plate wb-plate-sm wb-face-steel wb-acc-ember flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left shadow-xl ${FOCUS_RING_CLASS}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {/* "Up next", not "Next": the phase control's Next button is a
            different move, and the two must not read as the same word. */}
        <span className="shrink-0 text-[9px] font-semibold tracking-widest text-steel-400 uppercase">Up next</span>
        <span className="truncate text-xs font-bold text-coral-100">{nextBeatTitle ?? 'Boss beat'}</span>
      </span>
      {/* The plate breathes to say "waiting on you"; the label does not, so
          Continue never dips under its contrast floor while it waits. */}
      <span className="shrink-0 text-xs font-black tracking-widest text-coral-300 uppercase">Continue ▸</span>
    </button>
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
      <div className="wb-plate wb-plate-sm wb-face-steel wb-acc-gold flex items-center justify-between py-2 text-xs font-semibold text-gold-100 shadow-lg">
        <span>Pick a Minion</span>
        <button
          type="button"
          onClick={cancelTargeting}
          className={`wb-plate wb-plate-sm wb-face-gold wb-acc-gold pointer-events-auto min-h-11 font-bold text-gold-950 ${FOCUS_RING_CLASS}`}
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
        className={`wb-pop-in wb-plate wb-plate-xl py-6 text-center ${
          victory ? 'wb-face-steel wb-acc-gold text-gold-100' : 'wb-face-steel wb-acc-ember text-ember-100'
        }`}
      >
        {victory ? (
          <HeroEmblem className="wb-float mx-auto h-12 w-12 text-gold-400" />
        ) : (
          <BossEmblem className="wb-float mx-auto h-12 w-12 text-coral-400" />
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
    <div className="flex min-h-dvh flex-wrap content-start items-start justify-center bg-navy-950 font-sans text-ceramic-200 sm:gap-6 sm:p-6">
      <main
        className={`relative flex ${FRAME_HEIGHT_CLASS} w-full max-w-full shrink-0 touch-manipulation flex-col overflow-clip bg-steel-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl select-none sm:w-[420px] sm:rounded-3xl sm:border sm:border-steel-700`}
        data-testid="play-surface"
      >
        <ProgramStrip />
        <PhaseControl />
        {/* overflow-hidden: the fixed-size Phaser canvas centers here and must
            clip, never spill over (or steal pointer events from) the HUD. */}
        {/* The board takes the full width of the play surface. It used to
            reserve 44px gutters on each side for the MovePad, which pinned the
            width-bound canvas at 302px and left 145px of the board area empty;
            the pad now sits in the strip below the bottom hex row, which a
            hexagonal board leaves empty across the full canvas width, so
            nothing has to be set aside for it. */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <PhaserBoard />
          <MovePad />
          {/* Transient guidance — the scripted cue, coach tips, the playout's
              Continue bar — floats over the board's top edge: bars appearing
              and disappearing must never resize the board mid-Encounter, and
              the top edge keeps them out of the thumb path between the board
              and the Hand. pointer-events pass through the stack's empty
              space so the hexes underneath stay tappable. */}
          <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex flex-col gap-1.5">
            <FirstTurnCue />
            <CoachMark />
            <MovePaymentCue />
            <PlayoutContinue />
          </div>
          {/* The tapped piece's Stat Panel floats over the board's lower
              edge — the persistent Boss and Hero bars left the HUD. */}
          <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10">
            <EntityInspect />
          </div>
        </div>
        <ActionBar />
        <Hand />
        <RejectionToast />
        <TargetingBanner />
        <PhaseBanner />
        <ReplaceConfirmModal />
        <OutcomeBanner />
        <GuideModal />
      </main>
      {/* The rail is a design tool, not part of the game. It renders in the
          dev server, or on any build with ?debug=1 in the URL — so it can be
          reached on the deployed site when wanted, and a playtester handed
          the URL cold never sees it. On a phone it used to wrap beneath the
          play surface and drag the game off screen when touched. */}
      {showDebugRail && <DebugRail />}
      {/* One popup surface for every tap-and-hold on the page. */}
      <HoldPopoverLayer />
    </div>
  )
}

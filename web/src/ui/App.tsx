import { useCatalog } from '@/content/CatalogContext'
import { useEffect } from 'react'
import { PhaserBoard } from '@/board/PhaserBoard'
import { fireTargeting } from '@/engine'
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
import { BeatCard, StandingDemand } from './BeatCard'
import { HeroFrame, HERO_FRAME_CLEARANCE_CLASS } from './HeroFrame'
import { MovePaymentCue } from './MovePaymentCue'
import { NotificationLayer, NotificationZone, Notify } from './NotificationLayer'
import { PhaseBanner } from './PhaseBanner'
import { PhaseControl } from './PhaseControl'
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
  // Docked: the refusal answers a tap on the Action Bar or the Hand, so it
  // belongs above them rather than at a fixed offset off the bottom of the
  // frame — which is how it used to land on the Action Bar itself.
  return (
    <Notify id="rejection">
      <div
        className="wb-slide-up wb-plate wb-plate-sm wb-face-steel wb-acc-ember py-2 text-center text-xs font-semibold text-ember-100"
        data-testid="rejection-toast"
      >
        {lastRejection}
      </div>
    </Notify>
  )
}

function TargetingBanner() {
  const targetingSlotIndex = useWorkbench((store) => store.targetingSlotIndex)
  const cancelTargeting = useWorkbench((store) => store.cancelTargeting)
  const catalog = useCatalog()
  const state = useWorkbench(selectState)
  if (targetingSlotIndex === null) {
    return null
  }
  const targetMode = fireTargeting(catalog, state, state.primaryHeroId, targetingSlotIndex).mode
  // Docked. At its old fixed `top-40` this prompt printed across the advance
  // control, which then sat in the phase strip — the one control the player
  // must not lose while a Top Card waits for its target.
  return (
    <Notify id="targeting">
      <div
        className="wb-slide-up wb-plate wb-plate-sm wb-face-steel wb-acc-gold flex items-center justify-between py-2 text-xs font-semibold text-gold-100 shadow-lg"
        data-testid="targeting-banner"
      >
        <span>{targetMode === 'hex' ? 'Pick a hex' : 'Pick a piece'}</span>
        <button
          type="button"
          onClick={cancelTargeting}
          className={`wb-plate wb-plate-sm wb-face-gold wb-acc-gold pointer-events-auto min-h-11 font-bold text-gold-950 ${FOCUS_RING_CLASS}`}
        >
          Cancel
        </button>
      </div>
    </Notify>
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
  // The stage's top rank. The Encounter ending outranks any phase word, and
  // the two never coexist anyway: this needs `state.active` to be false and
  // the phase banner needs it to be true.
  return (
    <Notify id="outcome">
      <div
        className={`wb-pop-in wb-plate wb-plate-xl py-6 text-center ${
          victory ? 'wb-face-steel wb-acc-gold text-gold-100' : 'wb-face-steel wb-acc-ember text-ember-100'
        }`}
        data-testid="outcome-banner"
        data-outcome={state.outcome}
      >
        {victory ? (
          <HeroEmblem className="wb-float mx-auto h-12 w-12 text-gold-400" />
        ) : (
          <BossEmblem className="wb-float mx-auto h-12 w-12 text-coral-400" />
        )}
        <div className="mt-2 text-2xl font-black tracking-widest uppercase">{victory ? 'Victory' : 'Defeat'}</div>
        <div className="mt-2 text-sm">{state.outcomeReason}</div>
      </div>
    </Notify>
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
        {/* One chrome band above the board, not two: the Boss program strip
            that used to sit here is gone, and the Escalation gauge it carried
            moved into the phase band under the Round track. */}
        <PhaseControl />
        {/* overflow-hidden: the fixed-size Phaser canvas centers here and must
            clip, never spill over (or steal pointer events from) the HUD. */}
        {/* The board takes the full width of the play surface, and nothing
            is set aside beside it: the direction pad that once claimed 44px
            gutters — pinning the width-bound canvas at 302px — and then the
            strip below the bottom hex row is gone entirely. A step is named
            by pointing at the hex, which is the gesture the board already
            teaches. */}
        {/* items-start, not items-center: the width-bound board cannot grow
            into the container's spare height, so centering split that space
            into two dead bands. Pinned to the top, the spare height pools at
            the bottom — under the last hex row — which is exactly where the
            Hero Frame and the dock's prompts live (D-065). */}
        <div className="relative flex min-h-0 flex-1 items-start justify-center overflow-hidden">
          <PhaserBoard />
          {/* Every floating surface on the play field lands in one of three
              zones, and the zones are flex siblings of one column — so no two
              of them can share a pixel, and a bar appearing or leaving never
              resizes the board mid-Encounter. Which zone a member belongs to
              and where it sits inside it are settled in `notifications.ts`,
              not by the order they are written here; pointer-events pass
              through the empty space so the hexes stay tappable.

              Guidance floats over the top hexes: teaching the player may
              ignore. The stage takes the middle for one announcement at a
              time. The dock hugs the Action Bar with everything that asks for
              a tap on the controls just below it. */}
          <NotificationLayer clearanceClass={HERO_FRAME_CLEARANCE_CLASS}>
            <NotificationZone zone="guidance">
              <FirstTurnCue />
              <CoachMark />
            </NotificationZone>
            <NotificationZone zone="stage">
              <PhaseBanner />
              <OutcomeBanner />
            </NotificationZone>
            <NotificationZone zone="dock">
              <BeatCard />
              <StandingDemand />
              <TargetingBanner />
              <MovePaymentCue />
              <RejectionToast />
              <EntityInspect />
            </NotificationZone>
          </NotificationLayer>
          {/* The Hero Frame (D-065): the primary Hero's persistent readout
              and the Signature control, floating over the board's bottom
              edge as the dock's floor. Its own layer, not a notification —
              it never comes or goes, so it has no rank to claim. */}
          <HeroFrame />
        </div>
        <ActionBar />
        <Hand />
        <ReplaceConfirmModal />
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

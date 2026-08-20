import { PhaserBoard } from '@/board/PhaserBoard'
import { ActionBar } from './actionBar/ActionBar'
import { BeatCard, StandingDemand } from './overlays/BeatCard'
import { CoachMark } from './onboarding/CoachMark'
import { DebugRail, showDebugRail } from './debug/DebugRail'
import { EntityInspect } from './overlays/EntityInspect'
import { FirstTurnCue } from './onboarding/FirstTurnCue'
import { GuideModal } from './onboarding/GuideModal'
import { Hand } from './hand/Hand'
import { HeroFrame, HERO_FRAME_CLEARANCE_CLASS } from './hero/HeroFrame'
import { HoldPopoverLayer } from './common/HoldPopover'
import { MovePaymentCue } from './overlays/MovePaymentCue'
import { NotificationLayer, NotificationZone } from './overlays/NotificationLayer'
import { OutcomeBanner } from './overlays/OutcomeBanner'
import { PhaseBanner } from './overlays/PhaseBanner'
import { PhaseControl } from './chrome/PhaseControl'
import { RejectionToast } from './overlays/RejectionToast'
import { ReplaceConfirmModal } from './actionBar/ReplaceConfirmModal'
import { TargetingBanner } from './overlays/TargetingBanner'
import { FRAME_HEIGHT_CLASS } from './common/theme'

// The play surface, and nothing but its composition: which components exist,
// which layer each one sits in, and in what order. Every member below owns
// its own state, reads the store itself, and can be moved between zones
// without this file learning anything about what it does.

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

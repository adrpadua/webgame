import type { Phase } from '@/engine'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'

// The phase the HUD presents right now. While a resolved batch's Boss Beats
// are still replaying, the rules have already advanced into the player's
// next window, but on screen the Boss is still acting: every phase-naming
// surface — the Round track, the Phase Banner, the program strip's track
// labels, coaching — shows the playout's held phase until the replay
// settles, then falls back to the authoritative one. Presentation only:
// rules paths (legality, skip warnings, advance) keep reading state.phase.
export function usePresentedPhase(): Phase {
  const heldPhase = usePlayout((store) => store.heldPhase)
  const statePhase = useWorkbench((store) => selectState(store).phase)
  return heldPhase ?? statePhase
}

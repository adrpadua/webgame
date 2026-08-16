import { selectState, useWorkbench } from '@/store/workbench'
import type { Phase } from '@/engine'
import { blocksTarget } from './firstTurnScript'
import { useFirstTurnStep } from './useFirstTurn'
import { phaseDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { FOCUS_RING_CLASS, GATED_CLASS, SPOTLIGHT_CLASS } from './theme'

// One word per phase, in the Encounter's own vocabulary and its own colour:
// amber beats (Instant, Incoming) belong to the Boss, green Quick and blue
// Slow are yours, grey Loadout is setup. The tones are the same ones the
// How to Play guide's timeline diagram and the Phase Banner wear — the
// track the tutorial teaches is the track the HUD shows. Change together.
const PHASES: { phase: Phase; label: string; activeClass: string }[] = [
  { phase: 'loadout', label: 'Loadout', activeClass: 'bg-zinc-600 text-zinc-50 shadow-zinc-950' },
  { phase: 'instant', label: 'Instant', activeClass: 'bg-amber-500 text-amber-950 shadow-amber-900' },
  { phase: 'quick', label: 'Quick', activeClass: 'bg-emerald-500 text-emerald-950 shadow-emerald-900' },
  { phase: 'incoming', label: 'Incoming', activeClass: 'bg-amber-500 text-amber-950 shadow-amber-900' },
  { phase: 'slow', label: 'Slow', activeClass: 'bg-sky-500 text-sky-950 shadow-sky-900' },
]

// The Round track plus the one control that moves it. Holding the track
// explains the window you are standing in. The five chips stay on one
// unwrapped row: at phone width they used to wrap and push the track into a
// second line under the Next button.
export function PhaseControl() {
  const state = useWorkbench(selectState)
  const advance = useWorkbench((store) => store.advance)
  const restart = useWorkbench((store) => store.restart)
  const step = useFirstTurnStep()
  const hold = useHold(phaseDetail(state.phase, true))
  const nextGated = blocksTarget(step, 'next')
  const nextSpotlit = step !== null && step.targets.includes('next')

  return (
    <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/60 px-3 py-1.5" data-phase={state.phase}>
      <button
        type="button"
        {...hold.holdProps}
        data-testid="phase-track"
        aria-label={`Current phase: ${state.phase}`}
        className={`flex min-h-11 flex-1 items-center gap-1 rounded-lg text-left ${FOCUS_RING_CLASS}`}
      >
        {PHASES.map((entry) => (
          <span
            key={entry.phase}
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase transition-all duration-300 ${
              state.phase === entry.phase ? `scale-105 font-bold shadow-md ${entry.activeClass}` : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {entry.label}
          </span>
        ))}
      </button>
      {state.active ? (
        <button
          type="button"
          data-testid="next-phase"
          onClick={advance}
          className={`min-h-12 shrink-0 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 active:scale-95 ${FOCUS_RING_CLASS} ${
            nextSpotlit ? SPOTLIGHT_CLASS : ''
          } ${nextGated ? GATED_CLASS : ''}`}
        >
          Next
        </button>
      ) : (
        <button
          type="button"
          data-testid="restart"
          onClick={() => restart()}
          className={`min-h-12 shrink-0 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-500 active:scale-95 ${FOCUS_RING_CLASS}`}
        >
          Restart
        </button>
      )}
    </div>
  )
}

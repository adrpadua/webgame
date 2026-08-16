import { selectState, useWorkbench } from '@/store/workbench'
import type { Phase } from '@/engine'
import { blocksTarget } from './firstTurnScript'
import { useFirstTurnStep } from './useFirstTurn'
import { phaseDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { FOCUS_RING_CLASS, GATED_CLASS, SPOTLIGHT_CLASS } from './theme'

// One word per phase, in the Encounter's own vocabulary: amber beats
// (Instant, Incoming) belong to the Boss, the rest are yours.
const PHASES: { phase: Phase; label: string }[] = [
  { phase: 'loadout', label: 'Loadout' },
  { phase: 'instant', label: 'Instant' },
  { phase: 'quick', label: 'Quick' },
  { phase: 'incoming', label: 'Incoming' },
  { phase: 'slow', label: 'Slow' },
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
              state.phase === entry.phase ? 'scale-105 bg-emerald-600 text-white shadow-md shadow-emerald-900' : 'bg-zinc-800 text-zinc-500'
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

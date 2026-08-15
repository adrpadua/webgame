import { selectState, useWorkbench } from '@/store/workbench'
import type { Phase } from '@/engine'

const PHASES: { phase: Phase; label: string }[] = [
  { phase: 'loadout', label: 'Loadout' },
  { phase: 'instant', label: 'Boss Instant' },
  { phase: 'quick', label: 'Quick' },
  { phase: 'incoming', label: 'Boss Incoming' },
  { phase: 'slow', label: 'Slow' },
]

export function PhaseControl() {
  const state = useWorkbench(selectState)
  const advance = useWorkbench((store) => store.advance)
  const restart = useWorkbench((store) => store.restart)
  return (
    <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/60 px-3 py-2" data-phase={state.phase}>
      <div className="flex flex-1 flex-wrap gap-1">
        {PHASES.map((entry) => (
          <span
            key={entry.phase}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              state.phase === entry.phase ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {entry.label}
          </span>
        ))}
      </div>
      {state.active ? (
        <button
          type="button"
          data-testid="next-phase"
          onClick={advance}
          className="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 active:scale-95"
        >
          Next
        </button>
      ) : (
        <button
          type="button"
          data-testid="restart"
          onClick={() => restart()}
          className="min-h-11 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-500 active:scale-95"
        >
          Restart
        </button>
      )}
    </div>
  )
}

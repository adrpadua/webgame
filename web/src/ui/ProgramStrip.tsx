import { useState } from 'react'
import { currentProgram } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { FOCUS_RING_CLASS } from './theme'

// The boss-program strip: tap to expand or collapse its three-beat Instant
// and Incoming tracks.
export function ProgramStrip() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const [expanded, setExpanded] = useState(true)
  const program = currentProgram(catalog, state)
  if (!program) {
    return null
  }
  const rows: { track: 'instant' | 'incoming'; label: string; active: boolean }[] = [
    { track: 'instant', label: 'Instant', active: state.phase === 'instant' },
    { track: 'incoming', label: 'Incoming', active: state.phase === 'incoming' },
  ]
  return (
    <button
      type="button"
      onClick={() => setExpanded((current) => !current)}
      className={`min-h-11 w-full border-b border-zinc-800 bg-zinc-900/60 px-4 py-2 text-left text-[11px] ${FOCUS_RING_CLASS}`}
      data-testid="program-strip"
      data-expanded={expanded}
    >
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500">
        <span>{program.title}</span>
        <span>{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded &&
        rows.map((row) => (
        <div key={row.track} className="flex items-center gap-2 py-0.5">
          <span className={`w-16 shrink-0 font-semibold ${row.active ? 'text-amber-400' : 'text-zinc-500'}`}>{row.label}</span>
          <div className="flex flex-wrap gap-1">
            {(row.track === 'instant' ? program.instant_beats : program.incoming_beats).map((beat, index) => (
              <span
                key={`${beat.id}-${index}`}
                className={`rounded px-1.5 py-0.5 ${row.active ? 'bg-amber-950 text-amber-200' : 'bg-zinc-800 text-zinc-400'}`}
                title={beat.rules_text}
                aria-label={`${beat.title}: ${beat.rules_text}`}
              >
                {beat.title}
              </span>
            ))}
          </div>
        </div>
        ))}
    </button>
  )
}

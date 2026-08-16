import { useState } from 'react'
import { currentProgram, type BossBeat } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { beatDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { FOCUS_RING_CLASS } from './theme'

// The boss-program strip: two tracks of named beats, in order. The chips
// carry names only — hold one to read what it does, what it leaves behind,
// and what counters it.
function BeatChip({ beat, track, active }: { beat: BossBeat; track: 'instant' | 'incoming'; active: boolean }) {
  const hold = useHold(beatDetail(beat, track))
  return (
    <button
      type="button"
      {...hold.holdProps}
      data-testid="beat-chip"
      className={`rounded px-1.5 py-0.5 text-[11px] ${FOCUS_RING_CLASS} ${active ? 'bg-amber-950 text-amber-200' : 'bg-zinc-800 text-zinc-400'}`}
    >
      {beat.title}
    </button>
  )
}

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
    <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-1" data-testid="program-strip" data-expanded={expanded}>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className={`flex min-h-11 w-full items-center justify-between text-[10px] tracking-widest text-zinc-500 uppercase ${FOCUS_RING_CLASS}`}
      >
        <span>{program.title}</span>
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded &&
        rows.map((row) => (
          <div key={row.track} className="flex items-center gap-2 pb-1">
            <span className={`w-16 shrink-0 text-[11px] font-semibold ${row.active ? 'text-amber-400' : 'text-zinc-500'}`}>{row.label}</span>
            <div className="flex flex-wrap gap-1">
              {(row.track === 'instant' ? program.instant_beats : program.incoming_beats).map((beat, index) => (
                <BeatChip key={`${beat.id}-${index}`} beat={beat} track={row.track} active={row.active} />
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

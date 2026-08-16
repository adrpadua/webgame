import { useState } from 'react'
import { currentProgram, type BossProgram } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { programDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { FOCUS_RING_CLASS } from './theme'

// The boss-program strip: two tracks of named beats, in order. The chips
// stay compact labels rather than tiny buttons — a 21px target would break
// the pointer contract, and stacking six 44px chips would eat the board.
// Instead the whole strip is one hold surface: press anywhere on it for the
// full two-track breakdown, with the header button carrying the same detail
// for keyboard reach.
export function ProgramStrip() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const [expanded, setExpanded] = useState(true)
  const program = currentProgram(catalog, state)
  const detail = program ? programDetail(program) : null
  const headerHold = useHold(detail)
  const rowsHold = useHold(detail)
  if (!program) {
    return null
  }
  return (
    <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-1" data-testid="program-strip" data-expanded={expanded}>
      <button
        type="button"
        {...headerHold.holdProps}
        onClick={() => {
          if (!headerHold.consumeHold()) {
            setExpanded((current) => !current)
          }
        }}
        aria-expanded={expanded}
        aria-label={`${program.title}: hold for the full boss program`}
        className={`flex min-h-11 w-full items-center justify-between text-[10px] tracking-widest text-zinc-500 uppercase ${FOCUS_RING_CLASS}`}
      >
        <span>{program.title}</span>
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && (
        <div {...rowsHold.holdProps}>
          <Track program={program} track="instant" label="Instant" active={state.phase === 'instant'} />
          <Track program={program} track="incoming" label="Incoming" active={state.phase === 'incoming'} />
        </div>
      )}
    </div>
  )
}

function Track({ program, track, label, active }: { program: BossProgram; track: 'instant' | 'incoming'; label: string; active: boolean }) {
  const beats = track === 'instant' ? program.instant_beats : program.incoming_beats
  return (
    <div className="flex items-center gap-2 pb-1">
      <span className={`w-16 shrink-0 text-[11px] font-semibold ${active ? 'text-amber-400' : 'text-zinc-500'}`}>{label}</span>
      <div className="flex flex-wrap gap-1">
        {beats.map((beat, index) => (
          <span
            key={`${beat.id}-${index}`}
            data-testid="beat-chip"
            className={`rounded px-1.5 py-0.5 text-[11px] ${active ? 'bg-amber-950 text-amber-200' : 'bg-zinc-800 text-zinc-400'}`}
          >
            {beat.title}
          </span>
        ))}
      </div>
    </div>
  )
}

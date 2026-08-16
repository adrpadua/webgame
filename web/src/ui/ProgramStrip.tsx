import { useState } from 'react'
import { currentProgram, type BossBeat, type BossProgram } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { beatDetail, programDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { FOCUS_RING_CLASS } from './theme'

// The boss-program strip: two tracks of named beats, in order.
//
// The chips stay compact labels rather than tiny buttons — a 21px target
// would break the pointer contract, and stacking six 44px chips would eat
// the board. Detail arrives by pointer instead: hovering one chip explains
// that beat, and holding anywhere on the strip gives a touch player the
// whole two-track program at once. The header button carries the same
// program detail for keyboard reach.
function BeatChip({ beat, track, active }: { beat: BossBeat; track: 'instant' | 'incoming'; active: boolean }) {
  const hold = useHold(beatDetail(beat, track))
  return (
    <span
      {...hold.holdProps}
      data-testid="beat-chip"
      aria-label={`${beat.title}: ${beat.rules_text}`}
      className={`rounded px-1.5 py-0.5 text-[11px] ${active ? 'bg-amber-950 text-amber-200' : 'bg-zinc-800 text-zinc-400'}`}
    >
      {beat.title}
    </span>
  )
}

export function ProgramStrip() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const [expanded, setExpanded] = useState(true)
  const program = currentProgram(catalog, state)
  const detail = program ? programDetail(program) : null
  const headerHold = useHold(detail)
  // The rows hold for touch only: hovering here belongs to whichever chip
  // the mouse is actually over.
  const rowsHold = useHold(detail, { hover: false })
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
          <BeatChip key={`${beat.id}-${index}`} beat={beat} track={track} active={active} />
        ))}
      </div>
    </div>
  )
}

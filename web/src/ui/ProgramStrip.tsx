import { useState } from 'react'
import { currentProgram, forecast, type BossBeat, type BossProgram, type Forecast } from '@/engine'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'
import { beatDetail, forecastDetail, programDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { FOCUS_RING_CLASS } from './theme'

// The boss-program strip: three horizons, outermost first.
//
// `Forecast` previews next Round's whole program as one chip — a title and the
// counter tags it will want — because the disclosure contract says the outer
// horizon names the KIND of problem and nothing more (ADR 0026). Per-beat
// forecasting would reveal the whole next Round and leave the complete
// disclosure state with no job. `Instant` and `Incoming` then carry the named
// beats, complete.
//
// The chips stay compact labels rather than tiny buttons — a 21px target
// would break the pointer contract, and stacking six 44px chips would eat
// the board. Detail arrives by pointer instead: hovering one chip explains
// that beat, and holding anywhere on the strip gives a touch player the
// whole two-track program at once. The header button carries the same
// program detail for keyboard reach.
function BeatChip({ beat, track, active }: { beat: BossBeat; track: 'instant' | 'incoming'; active: boolean }) {
  const hold = useHold(beatDetail(beat, track))
  // While the playout replays this beat, its chip lights up and pulses so
  // the action on the board reads back to its place in the program.
  const playing = usePlayout((store) => store.activeBeatId) === beat.id
  return (
    <span
      {...hold.holdProps}
      data-testid="beat-chip"
      data-playing={playing}
      aria-label={`${beat.title}: ${beat.rules_text}`}
      className={`wb-plate wb-plate-xs wb-face-dim wb-acc-none py-0.5 text-[11px] transition-colors ${
        playing
          ? 'animate-pulse bg-coral-400 font-bold text-coral-950 shadow-md shadow-coral-900 motion-reduce:animate-none'
          : active
            ? 'bg-coral-950 text-coral-200'
            : 'bg-zinc-800 text-zinc-400'
      }`}
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
  const ahead = forecast(catalog, state)
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
          {ahead && <ForecastRow ahead={ahead} />}
          <Track program={program} track="instant" label="Instant" active={state.phase === 'instant'} />
          <Track program={program} track="incoming" label="Incoming" active={state.phase === 'incoming'} />
        </div>
      )}
    </div>
  )
}

// The outer horizon, and it must read as the faintest thing on the strip: a
// dashed title chip for the program, then its counter tags as secondary text.
// Giving the tags their own weight keeps the actionable half — what to hold in
// reserve — from being swallowed by the program's name.
function ForecastRow({ ahead }: { ahead: Forecast }) {
  const hold = useHold(forecastDetail(ahead))
  const severe = ahead.tier === 'severe'
  return (
    <div className="flex items-center gap-2 pb-1" data-testid="forecast-row">
      <span className="w-16 shrink-0 text-[11px] font-semibold text-zinc-600">Forecast</span>
      <div
        {...hold.holdProps}
        data-testid="forecast-chip"
        data-tier={ahead.tier}
        aria-label={`Next Round: ${ahead.title}. Answers wanted: ${ahead.counterTags.join(', ')}.`}
        className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5"
      >
        <span
          className={`rounded border border-dashed px-1.5 py-0.5 text-[11px] ${
            severe ? 'border-coral-700/80 text-coral-300' : 'border-zinc-700 text-zinc-400'
          }`}
        >
          {ahead.title}
        </span>
        {ahead.counterTags.length > 0 && (
          <span className="text-[9px] tracking-widest text-zinc-600 uppercase">{ahead.counterTags.join(' · ')}</span>
        )}
      </div>
    </div>
  )
}

function Track({ program, track, label, active }: { program: BossProgram; track: 'instant' | 'incoming'; label: string; active: boolean }) {
  const beats = track === 'instant' ? program.instant_beats : program.incoming_beats
  return (
    <div className="flex items-center gap-2 pb-1">
      <span className={`w-16 shrink-0 text-[11px] font-semibold ${active ? 'text-coral-400' : 'text-zinc-500'}`}>{label}</span>
      <div className="flex flex-wrap gap-1">
        {beats.map((beat, index) => (
          <BeatChip key={`${beat.id}-${index}`} beat={beat} track={track} active={active} />
        ))}
      </div>
    </div>
  )
}

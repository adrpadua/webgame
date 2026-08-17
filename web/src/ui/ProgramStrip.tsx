import { useState } from 'react'
import { currentProgram, forecast, type BossBeat, type BossProgram, type Forecast } from '@/engine'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'
import { EscalationGauge } from './EscalationGauge'
import { beatDetail, forecastDetail, programDetail } from './holdDetails'
import { useHold } from './HoldPopover'
import { FOCUS_RING_CLASS } from './theme'

// The boss-program strip: three horizons, in the order they arrive.
//
// `Instant` and `Incoming` carry this Round's named beats, complete;
// `Forecast` previews next Round's whole program as one chip — a title and the
// counter tags it will want — because the disclosure contract says the outer
// horizon names the KIND of problem and nothing more (ADR 0026). Per-beat
// forecasting would reveal the whole next Round and leave the complete
// disclosure state with no job.
//
// The rows read top to bottom in play order (Instant resolves, your Quick
// Window, then Incoming, then next Round) rather than outermost-horizon
// first. Putting Forecast on top spent the strip's brightest position — the
// one the eye lands on — on the one row that is deliberately vague, and made
// the reader re-sort three rows into time before any of them could be used.
//
// Only one horizon is ever the live one, and the strip says so with weight
// rather than with six identical frames. The resolving beat wears a plate;
// everything else is text. Six raked plates at one tone is a texture, not a
// hierarchy — it made the strip the busiest surface on the HUD while telling
// the player nothing about which row to read first.
//
// The beats stay compact labels rather than tiny buttons — a 21px target
// would break the pointer contract, and stacking six 44px chips would eat
// the board. Detail arrives by pointer instead: hovering one beat explains
// it, and holding anywhere on the strip gives a touch player the whole
// two-track program at once. The header button carries the same program
// detail for keyboard reach.

// The plate the resolving beat wears is the only frame in the strip, so the
// beats that are not resolving have to reserve its width or the row twitches
// sideways every time the playout moves on. 11px is wb-plate-xs's own
// padding-inline: its 3px rake offset plus 8px of clearance.
const BEAT_PAD = 'px-[11px] py-0.5'

function BeatChip({ beat, track, active }: { beat: BossBeat; track: 'instant' | 'incoming'; active: boolean }) {
  const hold = useHold(beatDetail(beat, track))
  // While the playout replays this beat, its chip lights up so the action on
  // the board reads back to its place in the program.
  const playing = usePlayout((store) => store.activeBeatId) === beat.id
  return (
    <span
      {...hold.holdProps}
      data-testid="beat-chip"
      data-playing={playing}
      aria-label={`${beat.title}: ${beat.rules_text}`}
      // A plate paints its own face, so the chip's state has to be a face and
      // not a background utility — a bg-* class on a wb-plate is discarded.
      // The resolving beat lights up as a coral plate with dark text; the
      // live row's beats are coral text; the rest are quiet text. No pulse:
      // the resolving beat is a state that lasts a whole moment, and the
      // plate face already carries it.
      className={`${BEAT_PAD} text-[11px] transition-colors ${
        playing
          ? 'wb-plate wb-plate-xs wb-acc-none wb-face-coral font-bold text-coral-950'
          : active
            ? 'font-semibold text-coral-200'
            : 'text-steel-400'
      }`}
    >
      {beat.title}
    </span>
  )
}

// One label column for every row, so the three horizons line up as a single
// list rather than three separate widgets. The live one is the only one in
// the Boss's colour.
function RowLabel({ children, active = false }: { children: string; active?: boolean }) {
  return <span className={`w-14 shrink-0 text-[10px] ${active ? 'font-semibold text-coral-300' : 'text-steel-500'}`}>{children}</span>
}

export function ProgramStrip() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const [expanded, setExpanded] = useState(true)
  const program = currentProgram(catalog, state)
  const ahead = forecast(catalog, state)
  const detail = program ? programDetail(program) : null
  const headerHold = useHold(detail)
  // The rows hold for touch only: hovering here belongs to whichever beat
  // the mouse is actually over.
  const rowsHold = useHold(detail, { hover: false })
  if (!program) {
    return null
  }
  return (
    <div className="border-b border-steel-800 bg-steel-950/60 px-4 py-1" data-testid="program-strip" data-expanded={expanded}>
      <div className="flex min-h-11 items-center justify-between gap-3">
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
          // The caret stays beside the title it collapses. Pushing it to the
          // button's far edge stranded it mid-row once the gauge took the
          // right, where it read as part of the gauge's label.
          className={`flex min-h-11 min-w-0 flex-1 items-center justify-start gap-2 text-[10px] tracking-widest text-steel-500 uppercase ${FOCUS_RING_CLASS}`}
        >
          <span className="truncate">{program.title}</span>
          <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        </button>
        <EscalationGauge state={state} enrageText={state.enrageText} />
      </div>
      {expanded && (
        <div className="pb-0.5" {...rowsHold.holdProps}>
          <Track program={program} track="instant" label="Instant" active={state.phase === 'instant'} />
          <Track program={program} track="incoming" label="Incoming" active={state.phase === 'incoming'} />
          {ahead && <ForecastRow ahead={ahead} />}
        </div>
      )}
    </div>
  )
}

// The outer horizon: a dashed title chip for the program, then its counter tags
// as secondary text, so the actionable half — what to hold in reserve — is not
// swallowed by the program's name.
//
// The tags used to be set in tracked capitals, which made a five-tag union the
// widest and loudest thing in the strip while saying the least: it is a
// reserve-this list, not a heading. Sentence case at the quiet-label step puts
// it back underneath the beats it is meant to be read after.
//
// The dashed border is what marks this row as not-yet-real, NOT a dimmer text
// colour. The first version reached for steel-600 to make Forecast the faintest
// row on the strip and landed at 2.35:1, well under WCAG AA; steel-500 is the
// palette's quiet-label step precisely because it is the dimmest value that
// still clears 4.5:1. A hierarchy built out of unreadable text is not a
// hierarchy.
function ForecastRow({ ahead }: { ahead: Forecast }) {
  const hold = useHold(forecastDetail(ahead))
  const severe = ahead.tier === 'severe'
  return (
    <div className="flex items-baseline gap-2 pt-0.5" data-testid="forecast-row">
      <RowLabel>Forecast</RowLabel>
      <div
        {...hold.holdProps}
        data-testid="forecast-chip"
        data-tier={ahead.tier}
        aria-label={`Next Round: ${ahead.title}. Answers wanted: ${ahead.counterTags.join(', ')}.`}
        className="flex min-w-0 flex-wrap items-baseline gap-x-2"
      >
        <span
          // px-2.5 plus the 1px dashed border comes to the same 11px the
          // beats above reserve, so the three rows share one left edge.
          className={`rounded border border-dashed px-2.5 text-[11px] ${
            severe ? 'border-coral-700/80 text-coral-300' : 'border-steel-700 text-steel-400'
          }`}
        >
          {ahead.title}
        </span>
        {ahead.counterTags.length > 0 && <span className="text-[10px] text-steel-500">{ahead.counterTags.join(' · ')}</span>}
      </div>
    </div>
  )
}

function Track({ program, track, label, active }: { program: BossProgram; track: 'instant' | 'incoming'; label: string; active: boolean }) {
  const beats = track === 'instant' ? program.instant_beats : program.incoming_beats
  return (
    <div className="flex items-center gap-2 pb-0.5" data-testid="beat-track" data-track={track}>
      <RowLabel active={active}>{label}</RowLabel>
      {/* Beats sit shoulder to shoulder with a hairline between them, so a
          three-beat row reads as one sequence instead of three objects. The
          rule is drawn rather than punctuated: a middot is a text node, and
          the only shade dim enough to stay out of the way would have failed
          the play surface's 4.5:1 floor. A 1px div carries no text and so
          answers to nothing but the eye. */}
      <div className="flex min-w-0 flex-wrap items-center">
        {beats.map((beat, index) => (
          <span key={`${beat.id}-${index}`} className="flex items-center">
            {index > 0 && <span aria-hidden="true" className="h-3 w-px shrink-0 bg-steel-700" />}
            <BeatChip beat={beat} track={track} active={active} />
          </span>
        ))}
      </div>
    </div>
  )
}

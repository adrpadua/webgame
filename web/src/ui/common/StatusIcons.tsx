import { useCatalog } from '@/content/CatalogContext'
import { combatantRef, getCounters, type CounterInstance } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { useHold } from './HoldPopover'
import { statusLabel, statusMark, type StatusGlyph, type StatusMark, type StatusMaterial } from './statusIcons'
import { FOCUS_RING_CLASS } from './theme'

// The Status Icon (D-087, party-frame direction 1A): a Counter as a raked square
// rather than a word. It replaced the Counter chip, which spelled its title
// across a 74px plate — `SEARED` beside the Hero Frame took the width two
// Counters need, and a third one had nowhere to go on a 390pt surface.
//
// A square the size of a glyph is what an MMO's buff tray is, and it works
// for the same reason: the player learns one mark per rule and then reads the
// row at a glance, where a row of words has to be read left to right. The
// name is not lost — it is one hold away, with the authored rules text, the
// count, and the rounds, which is where the sentences have always lived
// (CONTEXT.md, Detail Popup).
//
// The square is a `wb-plate` like every other surface in the HUD, so it wears
// the interface direction's 8-degree rake and its leading-edge accent without
// re-deriving either: the accent band *is* the material channel, and the
// glyph is cut in the same material.
//
// Three things ride the square, and each is a number the player would
// otherwise have to open the popup to learn:
//   - the count, bottom-right, whenever more than one is held (CONTEXT.md,
//     Stat Panel: a count the player cannot see is a count they cannot spend
//     deliberately);
//   - the round clock, a bar across the foot draining left to right, on a
//     Counter with an authored duration;
//   - nothing at all on a Counter that is single and permanent, which is the
//     common case and should stay quiet.

const MATERIAL_COLOR: Record<StatusMaterial, string> = {
  ember: 'var(--color-ember-300)',
  coral: 'var(--color-coral-300)',
  glass: 'var(--color-glass-300)',
  gold: 'var(--color-gold-300)',
  cloth: 'var(--color-cloth-300)',
  steel: 'var(--color-steel-400)',
}

// The marks, filled rather than line art: the Keyword glyphs on a Compact
// Card are open strokes, so a filled glyph on a dark square is never mistaken
// for one at 16 pixels.
const GLYPHS: Record<StatusGlyph, React.ReactNode> = {
  // Fire, as one tongue.
  flame: <path d="M12 2c3 5 6 6.5 6 10.5A6 6 0 0 1 6 12.5C6 8.5 9 7 12 2Z" />,
  // A fault line: something that was whole and now takes more.
  crack: (
    <>
      <path d="M13 1 8 10h5l-4 13 3-11H7l6-11Z" />
      <path d="M17 3l4 5-4 4 2-9Z" opacity="0.6" />
    </>
  ),
  // The gate panel, doubled: cover held over cover.
  shield: (
    <>
      <path d="M12 3l8 3.2v6.3c0 5-3.2 8.4-8 9.5-4.8-1.1-8-4.5-8-9.5V6.2L12 3Z" />
      <path d="M12 7.5l4.5 1.8v3.6c0 2.8-1.8 4.8-4.5 5.5-2.7-.7-4.5-2.7-4.5-5.5V9.3L12 7.5Z" fill="var(--color-steel-800)" opacity="0.7" />
    </>
  ),
  // Rubble: ground that costs something to cross.
  blocks: <path d="M3 15h7v6H3v-6Zm8-6h6v12h-6V9Zm7 4h3v8h-3v-8Z" />,
  // The healing cross, which is also the Registry's stamp.
  cross: <path d="M10 2h4v7h7v4h-7v9h-4v-9H3V9h7V2Z" />,
  // A spearhead over its haft: what a blow is made of.
  spike: (
    <>
      <path d="M12 1l4 9-4 3-4-3 4-9Z" />
      <path d="M8 15h8l-4 8-4-8Z" />
    </>
  ),
  // Two links: held in place.
  chain: (
    <g fill="none" stroke="currentColor" strokeWidth="3">
      <rect x="3" y="4" width="8" height="7" rx="3" />
      <rect x="13" y="13" width="8" height="7" rx="3" />
      <path d="M9 11l6 3" />
    </g>
  ),
  // The unmarked Counter: a rhombus, hollowed so it reads as a frame around
  // nothing rather than as a solid mark that means something.
  mark: <path d="M12 2l7 10-7 10-7-10 7-10Zm0 4.6L7.7 12 12 17.4 16.3 12 12 6.6Z" />,
}

export function StatusIcon({
  mark,
  count,
  remainingRounds,
  durationRounds,
}: {
  mark: StatusMark
  count: number
  remainingRounds: number
  durationRounds: number
}) {
  const material = MATERIAL_COLOR[mark.material]
  const stacked = count > 1
  const clock = durationRounds > 0 && remainingRounds > 0
  return (
    <span
      // A 28px plate wears wb-plate-xs's rake, on a tighter gutter than the
      // chips that size class was written for: the square's whole content is
      // one 16px glyph, so the gutter only has to clear the 3px cut.
      className="wb-plate wb-plate-xs relative flex h-7 w-7 shrink-0 items-center justify-center"
      style={
        {
          '--wb-face': 'var(--color-steel-800)',
          '--wb-edge': 'var(--color-steel-500)',
          '--wb-acc': material,
          '--wb-gutter': '3px',
        } as React.CSSProperties
      }
      data-material={mark.material}
      data-glyph={mark.glyph}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" style={{ color: material }} fill="currentColor" aria-hidden="true">
        {GLYPHS[mark.glyph]}
      </svg>
      {stacked && (
        // Held to the face's own bottom-right corner, which the rake cuts in
        // by exactly --wb-off — so the count rides the plate rather than
        // hanging off its cut edge. It lifts clear of the clock when there is
        // one, for the same reason.
        <span
          className="absolute text-[9px] leading-none font-black text-ceramic-100"
          style={{ right: 'calc(var(--wb-off) + 1px)', bottom: clock ? '4px' : '1px', textShadow: '0 0 3px var(--color-navy-950)' }}
          data-testid="status-count"
        >
          {count}
        </span>
      )}
      {clock && (
        <span className="absolute bottom-0 left-0 h-0.5 bg-steel-950" style={{ right: 'var(--wb-off)' }} aria-hidden="true">
          <span
            className="absolute inset-y-0 left-0 transition-[width] duration-300"
            style={{ width: `${Math.min(100, (remainingRounds / durationRounds) * 100)}%`, background: material }}
            data-testid="status-clock"
          />
        </span>
      )}
    </span>
  )
}

// One control per live Counter, on whichever piece is holding it. Shared by
// the Hero Frame and the (Enemy-only) Stat Panel: the mechanism is two-sided
// (D-032), so one component renders a piece's Counters wherever that piece's
// readout lives. The popup quotes the authored rules text when the Counter
// came from `data/counters/`, and falls back to the trigger reason for
// engine-built ones.
function StatusControl({
  counter,
  rulesText,
  durationRounds,
}: {
  counter: CounterInstance
  rulesText: string
  durationRounds: number
}) {
  const stats = [{ label: 'Held', value: String(counter.count) }]
  if (counter.remainingRounds > 0) {
    stats.push({ label: 'Rounds left', value: String(counter.remainingRounds) })
  }
  const hold = useHold({
    id: `counter:${counter.id}`,
    title: counter.title,
    badge: 'Counter',
    tone: 'guard',
    stats,
    text: rulesText,
  })
  const label = statusLabel(counter.title, counter.count, counter.remainingRounds)
  return (
    <button
      type="button"
      {...hold.holdProps}
      data-testid="status-icon"
      data-counter={counter.id}
      // No `title`: this control already answers a hover with the Detail
      // Popup, and a native tooltip racing it is two readouts for one gesture.
      aria-label={label}
      // The square is 28px and the target is 44px: the icon is what the
      // player reads and the padding around it is what the finger gets, which
      // is how a buff tray stays a tray without breaking the 44pt rule. The
      // control is explicitly pointer-enabled because the Hero Frame's row is
      // a pass-through layer over the board.
      className={`pointer-events-auto flex min-h-11 min-w-11 shrink-0 items-center justify-center ${FOCUS_RING_CLASS}`}
    >
      <StatusIcon
        mark={statusMark(counter.id)}
        count={counter.count}
        remainingRounds={counter.remainingRounds}
        durationRounds={durationRounds}
      />
    </button>
  )
}

export function StatusIcons({ entityId }: { entityId: string }) {
  const state = useWorkbench(selectState)
  const catalog = useCatalog()
  return (
    <>
      {getCounters(state, combatantRef(entityId)).map((counter) => (
        <StatusControl
          key={counter.id}
          counter={counter}
          rulesText={catalog.counters[counter.id]?.rules_text ?? counter.triggerReason}
          durationRounds={catalog.counters[counter.id]?.duration_rounds ?? counter.remainingRounds}
        />
      ))}
    </>
  )
}

import { useCatalog } from '@/content/CatalogContext'
import { selectPilotId, selectState, useWorkbench } from '@/store/workbench'
import { partyFrames, type PartyFrameModel } from './partyFrames'
import { unactedHeroIds } from './unacted'
import { GAUGE_FILL_CLASS, GAUGE_LABEL_CLASS, FOCUS_RING_CLASS, NUDGE_RING_CLASS, healthBarScale } from '../common/theme'

// The ally frames (party-frame layout direction 1A): a left-edge column of
// readouts growing upward from the primary Hero's frame, over board pixels
// the melee party is standing near anyway — the board keeps 100% of its
// width. Every frame is the primary frame's anatomy with the console
// removed: name, then health with the Armor overlay, then the Signature
// bank. No piles, no controls.
//
// A frame at rest owes no tap target, so the resting height is free to stay
// under 44px. In the one moment a legal ally action exists — the primary
// Hero adjacent to a Downed ally with a card in hand — that frame alone
// becomes the button: its accent turns living gold and a tap parks the
// rescue the way a move parks, waiting on the Hand to name the card that
// pays. Nothing else on screen moves, and no second interactive row ever
// appears.
//
// The unacted nudge (D-093 — Total War's "a unit has not moved", read onto the
// frame rather than only onto the button): a seat that has not used the open
// window and still could grows an unspent pip beside its name, wearing the
// living-gold bloom until it acts, the window closes, or the player takes
// control of it. The rail wears the same bloom for the same state, so the
// frame and the button say one thing in one mark.
//
// The motion is on the pip and nowhere else. Not the face — the frame carries
// a name, a health number and a bank, and `wb-face-pulse` dips all three under
// their contrast floor. Not the accent band either, which is already the
// status channel: Role, the Boss's attention, and a body on the floor all
// speak through it, and a fourth meaning that *moves* would make the other
// three ambiguous. A pip has nothing written on it and no other job.
//
// It loops, which the interface direction otherwise reserves for ambient
// motion, because it is the same "waiting on you" state the revive offer and
// the scripted turn's ring already loop for: bounded by the player's own next
// press, never by a Round. And the mark is legible with the bloom removed, so
// a `prefers-reduced-motion` player — who gets no animation at all — still
// sees which seat is waiting.

// Role accent: the Signal cloth channel, one step per Role — Tank 500,
// Healer 300, Damage 400 (two Damage share a step; they are one Role).
function roleAccent(role: string): string {
  return role === 'tank' ? 'var(--color-cloth-500)' : role === 'healer' ? 'var(--color-cloth-300)' : 'var(--color-cloth-400)'
}

// Status outranks Role on the accent channel: living gold for the one frame
// the player can operate, ember for a body on the floor, ember coral for the
// Boss's attention.
function frameAccent(frame: PartyFrameModel): string {
  if (frame.revivable) {
    return 'var(--color-gold-400)'
  }
  if (frame.status !== 'living') {
    return 'var(--color-ember-500)'
  }
  if (frame.threat) {
    return 'var(--color-coral-500)'
  }
  return roleAccent(frame.role)
}

function RoleGlyph({ role }: { role: string }) {
  if (role === 'tank') {
    return (
      <svg viewBox="0 0 48 48" className="h-3 w-3 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M24 4 40 10v12c0 10-6 18-16 22C14 40 8 32 8 22V10L24 4Z" />
      </svg>
    )
  }
  if (role === 'healer') {
    return (
      <svg viewBox="0 0 48 48" className="h-3 w-3 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M20 5h8v13h13v8H28v17h-8V26H7v-8h13V5Z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 48 48" className="h-3 w-3 shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M24 3l7 15-7 7-7-7 7-15Z" />
      <path d="M17 27h14l-7 18-7-18Z" />
    </svg>
  )
}

function AllyFrame({ frame }: { frame: PartyFrameModel }) {
  const reviveTapped = useWorkbench((store) => store.reviveTapped)
  const switchControl = useWorkbench((store) => store.switchControl)
  const offering = useWorkbench((store) => store.pendingRevive?.targetId === frame.heroId)
  const down = frame.status !== 'living'
  const scale = healthBarScale(frame.health, frame.maxHealth, frame.armor)
  const healthFraction = down ? 0 : Math.max(0, frame.health) / scale
  const armorFraction = down ? 0 : Math.max(0, frame.armor) / scale
  const accent = frameAccent(frame)
  return (
    <button
      type="button"
      data-testid="ally-frame"
      data-hero-id={frame.heroId}
      data-status={frame.status}
      data-revivable={frame.revivable || undefined}
      data-threat={frame.threat || undefined}
      data-unacted={frame.unacted || undefined}
      aria-label={
        frame.revivable
          ? `${frame.name}, Downed. Tap to revive for one card.`
          : `${frame.name}, ${down ? frame.status : `${frame.health} of ${frame.maxHealth} health`}.${
              frame.unacted ? ' Has not acted this window.' : ''
            } Tap to take control.`
      }
      // The 44pt rule: at rest the frame is a 40px readout that swallows no
      // taps; while a rescue is legal the same frame grows its hit box
      // outward with padding into the gap it already owns.
      className={`wb-plate wb-plate-sm pointer-events-auto flex w-full flex-col items-stretch gap-0.5 py-1 text-left ${FOCUS_RING_CLASS} cursor-pointer ${offering ? 'wb-face-pulse' : ''} ${frame.status === 'incapacitated' ? 'opacity-60' : ''}`}
      style={{ '--wb-face': 'var(--color-steel-950)', '--wb-acc': accent } as React.CSSProperties}
      // The one legal ally action keeps the frame (direction 1A's rule);
      // otherwise the frame is the switch — BG3's portrait click, arrived at
      // through the party-switching research note. Whole-panel swap, shared
      // board, and deliberately no camera movement.
      onClick={() => {
        if (frame.revivable) {
          reviveTapped(frame.heroId)
          return
        }
        switchControl(frame.heroId)
      }}
    >
      <span className="flex min-w-0 items-center gap-1 leading-none">
        <span style={{ color: roleAccent(frame.role) }}>
          <RoleGlyph role={frame.role} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ceramic-300">{frame.name}</span>
        {/* The unacted mark: an unspent pip, hollow because nothing has been
            spent yet, wearing the living-gold bloom the rail wears for the
            same state. The ring is the motion and the pip is the state, which
            is what makes the cue survive `prefers-reduced-motion` — the bloom
            stops, the mark stays. */}
        {frame.unacted && (
          <span
            data-testid="ally-unacted"
            className={`h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] border-gold-400 ${NUDGE_RING_CLASS}`}
            title="Has not acted this window"
          />
        )}
        {frame.threat && !down && (
          <span className="flex shrink-0 items-center gap-0.5" title="The Boss's attention">
            <span className="h-2.5 w-2.5 bg-coral-400 [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
            <span className="h-2.5 w-[3px] bg-coral-500" />
          </span>
        )}
      </span>
      <span
        className={`relative block h-3 overflow-hidden rounded-sm ${down ? 'wb-downed-track' : 'bg-steel-950'}`}
        data-testid="ally-health"
      >
        <span className={`${GAUGE_FILL_CLASS} bg-ember-500/70`} style={{ width: `${healthFraction * 100}%` }} />
        <span
          className="absolute inset-y-0 bg-glass-500/70 transition-[left,width] duration-300"
          style={{ left: `${healthFraction * 100}%`, width: `${armorFraction * 100}%` }}
        />
        <span className={`${GAUGE_LABEL_CLASS} text-[9px] ${down ? 'tracking-widest text-ember-300' : 'text-ember-100'}`}>
          {frame.status === 'incapacitated'
            ? 'INCAPACITATED'
            : frame.status === 'downed'
              ? frame.revivable
                ? 'REVIVE · 1 CARD'
                : 'DOWNED'
              : frame.armor > 0
                ? `${frame.health}+${frame.armor}/${frame.maxHealth}`
                : `${frame.health}/${frame.maxHealth}`}
        </span>
      </span>
      {frame.signatureCap > 0 && frame.status === 'living' && (
        <span className="flex h-[5px] gap-0.5" data-testid="ally-signature">
          {Array.from({ length: frame.signatureCap }, (_, index) => (
            <span
              key={index}
              className={`flex-1 rounded-[2px] ${
                index < frame.signatureCharges
                  ? frame.signatureCharges >= frame.signatureCap
                    ? 'bg-gold-300'
                    : 'bg-gold-500'
                  : 'bg-steel-700'
              }`}
            />
          ))}
        </span>
      )}
    </button>
  )
}

// The column: seats in authored order, growing downward toward the primary
// frame so the whole party reads as one object anchored at the bottom-left.
// Renders nothing for a solo Encounter — the seam costs the teaching slice
// zero pixels.
export function PartyFrames() {
  const catalog = useCatalog()
  const state = useWorkbench(selectState)
  const pilotId = useWorkbench(selectPilotId)
  // The timeline, subscribed as its two fields: who has acted this window is a
  // question about the facts behind the current position, not about the state
  // at it. `entries` is a new array only when a step lands, so this is the same
  // subscription cadence the frame already has through `selectState`.
  const entries = useWorkbench((store) => store.entries)
  const index = useWorkbench((store) => store.index)
  const frames = partyFrames(catalog, state, pilotId, unactedHeroIds(catalog, { entries, index }))
  if (frames.length === 0) {
    return null
  }
  return (
    <div className="pointer-events-none absolute bottom-[64px] left-2 z-30 flex w-[138px] flex-col gap-1" data-testid="party-frames">
      {frames.map((frame) => (
        <AllyFrame key={frame.heroId} frame={frame} />
      ))}
    </div>
  )
}

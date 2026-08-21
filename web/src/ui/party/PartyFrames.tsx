import { useCatalog } from '@/content/CatalogContext'
import { selectPilotId, selectState, useWorkbench } from '@/store/workbench'
import { captureFrameBoxes, useSwapFlip } from './controlSwap'
import { allyTap, partyFrames, type PartyFrameModel } from './partyFrameModel'
import { nextNudge, unactedHeroIds } from './unacted'
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
// window and still could grows an unspent pip beside its name, until it acts,
// the window closes, or the player takes control of it.
//
// The pip says two things, not one, because the rail's press goes to exactly
// one frame. In living gold, wearing the rail's own bloom: this is the seat the
// next press hands over to. In quiet oathsteel: this seat owes the window an
// action, but the button at your thumb is not pointing here yet. Two seats
// never needed the distinction — the only waiting ally was always the next one
// — and three made it necessary, which is what the seat-count playtest found.
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
// press, never by a Round. Now exactly one mark loops however many seats are
// waiting, which is that rule holding at four seats as well as at two. And the
// materials carry the whole distinction on their own, so a
// `prefers-reduced-motion` player — who gets no animation at all — still sees
// both which seats are waiting and which one is next.

// The tuck (D-107, party-frame direction 1A's tab): the column narrows to 66pt and
// keeps only what it can say without words — the Role glyph, the health and
// Armor bar, the downed track, and the accent. What it drops is everything the
// accent is already saying at that width (the Threat mark) or that needs room
// to be read (the name, the health number, the Signature bank).
//
// One mark survives the tuck that the mockup did not draw, and deliberately:
// the unacted pip. The mockup's rule for dropping a glyph is that the accent
// still carries it — Threat is coral on the accent whether or not the wedge is
// drawn — and the accent carries no unacted channel at all. Dropping the pip
// would not compress that state, it would delete it, and re-open the silence
// D-093 exists to close, in the one arrangement where the player has explicitly
// stopped watching the column.
//
// The compression is visual only. Every frame's `aria-label` says the same
// sentence tucked or open, because a tuck is the player buying board pixels
// back and a screen reader is not spending any.
const COLUMN_WIDTH_CLASS = 'w-[138px]'
const TUCKED_COLUMN_WIDTH_CLASS = 'w-[66px]'
// 220ms, and not the swap's 300: a tuck answers a press on the thing that
// moves, so it owes the immediacy of direct manipulation rather than the
// legibility of a handover the player did not touch. Both are CSS transitions
// rather than Web Animations flights, which is why this one needs no
// reduced-motion branch — index.css's freeze block reaches transitions, and a
// tuck that lands instantly is still a tuck.
const TUCK_MOTION_CLASS = 'transition-[width] duration-[220ms] ease-[cubic-bezier(0.2,0.7,0.3,1)]'

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

function AllyFrame({ frame, pilotId, tucked }: { frame: PartyFrameModel; pilotId: string; tucked: boolean }) {
  const reviveTapped = useWorkbench((store) => store.reviveTapped)
  const switchControl = useWorkbench((store) => store.switchControl)
  const togglePartyTuck = useWorkbench((store) => store.togglePartyTuck)
  const offering = useWorkbench((store) => store.pendingRevive?.targetId === frame.heroId)
  // The demoted half of a control swap, and the shifted one: the displaced
  // Hero's plate flies down from the primary frame's box and shrinks into this
  // slot, and in a party bigger than two an untouched ally whose slot index
  // moved travels the difference (`controlSwap.ts`).
  const plate = useSwapFlip<HTMLButtonElement>(frame.heroId, pilotId)
  const down = frame.status !== 'living'
  const scale = healthBarScale(frame.health, frame.maxHealth, frame.armor)
  const healthFraction = down ? 0 : Math.max(0, frame.health) / scale
  const armorFraction = down ? 0 : Math.max(0, frame.armor) / scale
  const accent = frameAccent(frame)
  // Which of the three things a press means here, in precedence order and in
  // one place (`partyFrameModel.ts`) rather than as three ifs in the handler.
  const tap = allyTap(frame, tucked)
  return (
    <button
      type="button"
      ref={plate}
      data-testid="ally-frame"
      data-hero-id={frame.heroId}
      data-status={frame.status}
      data-revivable={frame.revivable || undefined}
      data-threat={frame.threat || undefined}
      data-unacted={frame.unacted || undefined}
      data-next-up={frame.nextUp || undefined}
      data-tucked={tucked || undefined}
      // The label never tucks. It always names the Hero, their health and the
      // window they owe — the compression is pixels, and a screen reader is
      // not short of those — and only its last sentence changes, because what
      // the press does is the one thing the tuck really altered.
      aria-label={`${frame.name}, ${
        down ? frame.status : `${frame.health} of ${frame.maxHealth} health`
      }.${
        frame.nextUp ? ' Has not acted this window, and is next on the forward rail.' : frame.unacted ? ' Has not acted this window.' : ''
      } ${tap === 'expand' ? 'Tap to show the party column.' : tap === 'revive' ? 'Tap to revive for one card.' : 'Tap to take control.'}`}
      // The 44pt rule: at rest the frame is a 40px readout that swallows no
      // taps; while a rescue is legal the same frame grows its hit box
      // outward with padding into the gap it already owns.
      // min-h-10 is the 40/44 rule's first half, stated in the layout rather
      // than left to whatever rows a state happens to render. It was already
      // drifting before the tuck existed — a Downed frame drops the Signature
      // bank and stood 34px — and the tuck, which drops the bank on every
      // frame, is what made a 40pt floor worth pinning: a column whose plates
      // change height when it narrows reads as a different object, not the
      // same one holding less.
      className={`wb-plate wb-plate-sm pointer-events-auto flex min-h-10 w-full flex-col items-stretch justify-center gap-0.5 py-1 text-left ${FOCUS_RING_CLASS} cursor-pointer ${offering ? 'wb-face-pulse' : ''} ${frame.status === 'incapacitated' ? 'opacity-60' : ''}`}
      style={{ '--wb-face': 'var(--color-steel-950)', '--wb-acc': accent } as React.CSSProperties}
      // The one legal ally action keeps the frame (direction 1A's rule);
      // otherwise the frame is the switch — BG3's portrait click, arrived at
      // through the party-switching research note. Whole-panel swap, shared
      // board, and deliberately no camera movement.
      onClick={() => {
        if (tap === 'expand') {
          togglePartyTuck()
          return
        }
        if (tap === 'revive') {
          reviveTapped(frame.heroId)
          return
        }
        // FLIP's First, and it has to happen here: React batches the store
        // write below, so this is the last moment the old layout is still on
        // screen to be measured. The frames animate the handover from it.
        captureFrameBoxes()
        switchControl(frame.heroId)
      }}
    >
      <span className="flex min-w-0 items-center gap-1 leading-none">
        <span style={{ color: roleAccent(frame.role) }}>
          <RoleGlyph role={frame.role} />
        </span>
        {!tucked && <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-ceramic-300">{frame.name}</span>}
        {/* The unacted mark: an unspent pip, hollow because nothing has been
            spent yet — in living gold with the rail's own bloom on the one seat
            the rail's next press hands over to, and in quiet oathsteel on every
            other seat that owes the window an action.

            Gold is the material for "there is a press here for you", and only
            one seat has one: the rail goes to exactly one frame per press. Gold
            on all of them said the same thing three times and left the player
            to guess which the button meant. Steel is the direction's blunted
            edge — owed, but not the press at your thumb.

            It also puts exactly one looping mark on screen whatever the party
            size, which is the ambient-motion rule holding at four seats as well
            as at two. And the two channels are independent: gold-vs-steel is
            the whole distinction with the bloom removed, so a
            `prefers-reduced-motion` player can still see which frame is next. */}
        {frame.unacted && (
          <span
            data-testid="ally-unacted"
            data-next-up={frame.nextUp || undefined}
            className={`h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] ${
              frame.nextUp ? `border-gold-400 ${NUDGE_RING_CLASS}` : 'border-steel-500'
            }`}
            title={frame.nextUp ? 'Has not acted this window — the forward rail hands over here next' : 'Has not acted this window'}
          />
        )}
        {/* The wedge goes when the column tucks, and nothing is lost: the
            accent is already coral for the Boss's attention, so at 66pt the
            glyph was saying it twice. That is the tuck's whole rule for what
            it may drop — everything the accent still carries. */}
        {frame.threat && !down && !tucked && (
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
        {/* The number goes; the bar stays. A tucked column still shows who is
            hurt and by how much — the fill is the reading a glance was taking
            anyway — and stops showing the arithmetic there is no room to set. */}
        {!tucked && (
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
        )}
      </span>
      {frame.signatureCap > 0 && frame.status === 'living' && !tucked && (
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

// The tuck tab: the column's own control, sitting at the top of the stack
// where the party ends and the board begins.
//
// It is 20px tall, which no tap-target rule would allow, so it carries an
// invisible 52x44 extension upward into board pixels — the same trade the
// column itself already makes, and the 40/44 rule's own escape: grow the hit
// box, never the drawn plate. The word `PARTY` is present only while the
// column is open, so tucking narrows the tab from 72pt to 30pt and the whole
// object gets out of the way together rather than leaving a labelled stub.
function PartyTab({ tucked, onToggle }: { tucked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      data-testid="party-tuck"
      data-tucked={tucked || undefined}
      aria-expanded={!tucked}
      aria-label={tucked ? 'Show the party column' : 'Tuck the party column'}
      title={tucked ? 'Show party' : 'Tuck party'}
      onClick={onToggle}
      className={`wb-plate wb-plate-xs wb-face-steel wb-acc-gold pointer-events-auto relative flex h-5 shrink-0 items-center gap-1 text-gold-300 ${FOCUS_RING_CLASS} ${TUCK_MOTION_CLASS} ${
        tucked ? 'w-[30px]' : 'w-[72px]'
      }`}
    >
      {/* The 44pt target the 20px plate cannot draw. */}
      <span className="absolute -top-6 left-0 h-11 w-[52px]" aria-hidden="true" />
      <svg
        viewBox="0 0 20 20"
        className={`h-2.5 w-2.5 shrink-0 transition-transform duration-[220ms] ease-[cubic-bezier(0.2,0.7,0.3,1)] ${tucked ? 'rotate-180' : ''}`}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12.8 3.6 6.4 10l6.4 6.4-1.8 1.8L2.8 10l8.2-8.2 1.8 1.8Z" />
      </svg>
      {/* 9px, not the mockup's 8: the type ramp has seven steps (D-067) and 8
          is not one of them. The ramp outranks the mockup on a value the
          mockup had no reason to pick deliberately. */}
      {!tucked && <span className="text-[9px] leading-none font-black tracking-[0.12em] uppercase">Party</span>}
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
  // Which seat the rail is pointing at is asked of `nextNudge` — the same
  // function the rail itself calls, with the same offer memory — rather than
  // guessed from the head of the unacted list. The two are not the same seat:
  // the walk starts after the pilot and skips whoever has already been offered
  // this window, so a pip that took the first unacted seat would light the
  // wrong frame from the second press onward.
  const nudged = useWorkbench((store) => store.nudgedHeroIds)
  const tucked = useWorkbench((store) => store.partyTucked)
  const togglePartyTuck = useWorkbench((store) => store.togglePartyTuck)
  const position = { entries, index }
  const frames = partyFrames(catalog, state, pilotId, {
    unacted: unactedHeroIds(catalog, position),
    nextUp: nextNudge(catalog, position, pilotId, nudged),
  })
  if (frames.length === 0) {
    return null
  }
  return (
    <div
      className={`pointer-events-none absolute bottom-[64px] left-2 z-30 flex flex-col items-start gap-1 ${TUCK_MOTION_CLASS} ${
        tucked ? TUCKED_COLUMN_WIDTH_CLASS : COLUMN_WIDTH_CLASS
      }`}
      data-testid="party-frames"
      data-tucked={tucked || undefined}
    >
      {/* The tab leads the stack, which is anchored at the bottom and grows
          upward — so it lands at the top, where the column meets the board. */}
      <PartyTab tucked={tucked} onToggle={togglePartyTuck} />
      {frames.map((frame) => (
        <AllyFrame key={frame.heroId} frame={frame} pilotId={pilotId} tucked={tucked} />
      ))}
    </div>
  )
}

import { combatantRef, getCounters, type CounterInstance, type HeroState } from '@/engine'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'
import { signatureControl, type SignatureControl as SignatureControlState } from './heroFrame'
import { useDamageFlash } from './useDamageFlash'
import { HeartIcon, HeroEmblem, ShieldIcon } from './icons'
import { HERO_STAT_DETAILS, slotDetail } from './holdDetails'
import { useHold, type HoldDetail } from './HoldPopover'
import { FOCUS_RING_CLASS, GAUGE_FILL_CLASS, GAUGE_LABEL_CLASS, GAUGE_TRACK_CLASS, healthBarScale } from './theme'

// The Hero Frame (D-058, ADR 0033): the primary Hero's persistent readout,
// floating over the board's bottom edge, built to the unit-frame anatomy an
// MMO player already reads — name attached to a dominant health bar, with
// the class resource as a thinner bar directly beneath it, where mana sits.
// It absorbed the hero branch of the Stat Panel whole (name, health with the
// Armor overlay, Counter chips, the deck gauge) and never dismisses; a tap
// on Elian's tile pulses it instead of opening a panel.
//
// The Signature is a separate control beside the frame, not a part of it:
// the frame is what you read and the button is what you press, which is the
// division both idioms this HUD borrows from already draw — an MMO keeps its
// abilities on a bar away from the unit frame, and a hero shooter keeps the
// ultimate button clear of the health readout. The frame's resource bar and
// the button are two faces of one state (`heroFrame.ts`): the bar carries
// the earn, the button carries the readiness.
//
// The board never resizes for any of it — at 390 points the board is
// width-bound and this floats in the container's spare height.

// The dock stacks upward from this row's top edge, so the notification layer
// needs the clearance it claims (its height plus its bottom margin).
export const HERO_FRAME_CLEARANCE_CLASS = 'pb-[60px]'

function StatBar({
  detail,
  icon: Icon,
  fillClass,
  textClass,
  widthClass,
  value,
  fraction,
  label,
}: {
  detail: HoldDetail
  icon: typeof HeartIcon
  fillClass: string
  textClass: string
  widthClass: string
  value: string
  fraction: number
  label: string
}) {
  const hold = useHold(detail)
  const filled = Math.max(0, Math.min(1, fraction))
  return (
    <button
      type="button"
      {...hold.holdProps}
      aria-label={`${label} ${value}`}
      className={`flex min-h-11 min-w-11 items-center justify-center ${FOCUS_RING_CLASS}`}
    >
      <span className={`${GAUGE_TRACK_CLASS} ${widthClass}`}>
        <span className={`${GAUGE_FILL_CLASS} ${fillClass}`} style={{ width: `${filled * 100}%` }} />
        <span className={`${GAUGE_LABEL_CLASS} text-[10px] ${textClass}`}>
          <Icon className="h-3 w-3 shrink-0" />
          <span>{value}</span>
        </span>
      </span>
    </button>
  )
}

// The unit frame's gauges: health as the dominant bar with Armor riding it in
// the same currency, and — where the Hero fields a Signature — the class
// resource as a thin bar beneath, in the position an MMO reserves for mana.
// Both live inside one 44px tap target: the stack is what makes the pair read
// as one frame, and it costs no height over the health bar alone.
function HeroGauges({
  hero,
  flashing,
  flashKey,
  signature,
}: {
  hero: HeroState
  flashing: boolean
  flashKey: number
  signature: SignatureControlState | null
}) {
  const hold = useHold({
    ...HERO_STAT_DETAILS.health,
    stats: [
      { label: 'Maximum', value: String(hero.maxHealth) },
      { label: 'Armor now', value: String(hero.armor) },
    ],
    text: `${HERO_STAT_DETAILS.health.text} ${HERO_STAT_DETAILS.armor.text}`,
  })
  const scale = healthBarScale(hero.health, hero.maxHealth, hero.armor)
  const healthFraction = Math.max(0, hero.health) / scale
  const armorFraction = Math.max(0, hero.armor) / scale
  const resourceLabel = signature === null ? '' : `, ${signature.resourceTitle} ${signature.charges} of ${signature.cap}`
  // Both bars sit inside one 44px tap target rather than stacking two of
  // them: the pair is one frame, one hold opens the vitals that explain it,
  // and the resource costs the frame no height over the health bar alone —
  // which is what keeps the dock's prompts clear of the bottom hex row.
  return (
    <button
      type="button"
      {...hold.holdProps}
      aria-label={`Health ${hero.health}/${hero.maxHealth}, Armor ${hero.armor}${resourceLabel}`}
      data-testid="hero-health"
      className={`flex min-h-11 min-w-11 flex-1 flex-col justify-center gap-[3px] ${FOCUS_RING_CLASS}`}
    >
      <span className={`${GAUGE_TRACK_CLASS} w-full`}>
        <span className={`${GAUGE_FILL_CLASS} bg-ember-500/70`} style={{ width: `${healthFraction * 100}%` }} />
        <span
          className="absolute inset-y-0 bg-glass-500/70 transition-[left,width] duration-300"
          style={{ left: `${healthFraction * 100}%`, width: `${armorFraction * 100}%` }}
        />
        <span className={`${GAUGE_LABEL_CLASS} text-[10px] text-ember-100`}>
          <HeartIcon className="h-3 w-3 shrink-0" />
          <span key={flashKey} className={flashing ? 'wb-damage-flash origin-left' : undefined}>
            {hero.health}/{hero.maxHealth}
          </span>
          {hero.armor > 0 && (
            <>
              <ShieldIcon className="ml-0.5 h-3 w-3 shrink-0 text-glass-300" />
              <span data-testid="hero-armor" className="text-glass-100">
                {hero.armor}
              </span>
            </>
          )}
        </span>
      </span>
      {signature !== null && <ResourceBar signature={signature} />}
    </button>
  )
}

// The class resource, as a bar rather than a control: it is read, never
// pressed — the Signature button beside it is what takes the press.
// Segmented because the resource is counted rather than continuous, so the
// bar can look like a mana bar without lying about what a Charge is. It is
// spoken by the gauge's own label, so nothing here needs its own voice.
function ResourceBar({ signature }: { signature: SignatureControlState }) {
  const { charges, cap, resourceTitle, face } = signature
  return (
    <span className="flex items-center gap-1.5" data-testid="signature-resource" data-charges={charges} aria-hidden="true">
      <span className="shrink-0 text-[8px] leading-none font-bold tracking-[0.08em] text-ceramic-700 uppercase">{resourceTitle}</span>
      <span className="flex h-[7px] flex-1 items-stretch gap-[2px] overflow-hidden rounded-xs bg-steel-950 p-[1px]">
        {Array.from({ length: cap }, (_, index) => (
          <span
            // Keyed by whether it is filled, so a fresh earn remounts that
            // segment and its pop plays exactly once — the frame half of the
            // earn moment; the board half floats at the Hero's hex.
            key={`${index}-${index < charges}`}
            // An empty segment has to be legible as a segment: the meter's
            // job while unearned is to say how many there are to fill, which
            // is how a permanently visible resource teaches its own earn.
            className={`flex-1 rounded-[1px] transition-colors ${
              index < charges ? `wb-pop-in ${face === 'ready' ? 'bg-gold-300' : 'bg-gold-500'}` : 'bg-steel-700'
            }`}
          />
        ))}
      </span>
      <span className="shrink-0 text-[9px] leading-none font-bold text-ceramic-700 tabular-nums">
        {charges}/{cap}
      </span>
    </span>
  )
}

// One chip per live Counter, on whichever piece is holding it. Shared with
// the (now Enemy-only) Stat Panel: the mechanism is two-sided (D-032), so
// one component renders a piece's Counters wherever that piece's readout
// lives. The popup quotes the authored rules text when the Counter came from
// `data/counters/`, and falls back to the trigger reason for engine-built
// ones.
function CounterChip({ counter, rulesText }: { counter: CounterInstance; rulesText: string }) {
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
  return (
    <button
      type="button"
      {...hold.holdProps}
      data-testid="counter-chip"
      data-counter={counter.id}
      className={`min-h-11 min-w-11 bg-gold-900 px-1.5 text-[10px] font-semibold text-gold-200 ${FOCUS_RING_CLASS}`}
    >
      {counter.title}
      {counter.count > 1 && <span className="ml-1 text-gold-100">{counter.count}</span>}
    </button>
  )
}

export function CounterChips({ entityId }: { entityId: string }) {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  return (
    <>
      {getCounters(state, combatantRef(entityId)).map((counter) => (
        <CounterChip key={counter.id} counter={counter} rulesText={catalog.counters[counter.id]?.rules_text ?? counter.triggerReason} />
      ))}
    </>
  )
}

// What the button says under the Signature's name. The word is the state,
// not a label for the control: `Fire` is the only one that names an action,
// because `ready` is the only face a press does anything in.
const FACE_WORD: Record<SignatureControlState['face'], string> = {
  empty: 'Earn it',
  banked: 'Held',
  ready: 'Fire',
  spent: 'Fired',
}

// The Signature button: its own plate beside the frame, and the one
// persistent ability control the HUD carries (ADR 0033, superseding ADR
// 0006's persistent-button clause). It never mounts or unmounts — it sits
// dark while the Signature is unearned, holds steel while a bank waits out a
// closed window, and ignites gold the moment the fixed Slot can fire, which
// is the "it appears" the hero-shooter idiom actually means. A tap fires
// through the same store path the Action Bar's Slots use.
function SignatureButton() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const fireSlot = useWorkbench((store) => store.fireSlot)
  const control = signatureControl(catalog, state)
  const hold = useHold(
    control === null
      ? null
      : slotDetail(control.card, state.heroes[state.primaryHeroId].actionBar[control.slotIndex], control.slotIndex, state.phase),
  )
  if (control === null) {
    return null
  }
  const { face, charges, cap, card, slotIndex, resourceTitle } = control
  const ready = face === 'ready'
  return (
    <button
      type="button"
      {...hold.holdProps}
      data-testid="signature-control"
      data-signature-face={face}
      data-charges={charges}
      aria-label={`${card.title}: ${charges} of ${cap} ${resourceTitle}${ready ? ', ready — tap to fire' : ''}`}
      onClick={() => {
        if (hold.consumeHold()) {
          return
        }
        if (ready) {
          fireSlot(slotIndex)
        }
      }}
      // Keyed on the face so entering `ready` remounts the plate and the
      // ignition plays once, on that transition only.
      key={face}
      className={`wb-plate wb-plate-sm pointer-events-auto flex min-h-13 w-[74px] shrink-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 ${
        ready ? 'wb-pop-in wb-face-gold wb-acc-gold text-gold-950' : 'wb-face-steel wb-acc-none text-ceramic-300'
      } ${face === 'empty' || face === 'spent' ? 'opacity-75' : ''} ${FOCUS_RING_CLASS}`}
    >
      <span className="w-full truncate text-center text-[10px] leading-none font-black tracking-wide uppercase">{card.title}</span>
      <span className={`text-[9px] leading-none font-bold tracking-wide uppercase ${ready ? 'text-gold-900' : 'text-steel-500'}`}>
        {FACE_WORD[face]}
      </span>
    </button>
  )
}

export function HeroFrame() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const heroId = state.primaryHeroId
  const hero = state.heroes[heroId]
  const override = usePlayout((store) => store.overrides[heroId])
  const pulse = useWorkbench((store) => store.heroFramePulse)
  const shownHealth = override?.health ?? hero?.health ?? 0
  // A hit must be visible even while the player's eyes are on the board: the
  // number flashes per beat, when the blow's playout moment arrives.
  const { flashing, flashKey } = useDamageFlash(shownHealth)
  if (!hero) {
    return null
  }
  const shownHero = override ? { ...hero, health: override.health, armor: override.armor ?? hero.armor } : hero
  // The deck gauge drains against every card the Hero owns, wherever it sits
  // right now: deck, hand, discard, or prepared into a Slot.
  const preparedCount = hero.actionBar.reduce((count, slot) => count + slot.charges.length + (slot.topCard === null ? 0 : 1), 0)
  const ownedCardCount = hero.deck.length + hero.hand.length + hero.discard.length + preparedCount
  const title = state.board.entities[heroId]?.title ?? heroId
  const signature = signatureControl(catalog, state)
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-stretch gap-1.5 px-2 pb-1">
      <div
        data-testid="hero-frame"
        // Keyed on the pulse counter: tapping Elian's tile replays the pop,
        // pointing the tap at the chrome that answers it.
        key={pulse}
        className="wb-pop-in wb-plate wb-plate-lg wb-face-ceramic wb-acc-cloth pointer-events-auto flex min-w-0 flex-1 items-center gap-1.5 py-1 text-ceramic-950"
      >
        <span className="flex max-w-[92px] shrink-0 items-center gap-1 text-[11px] font-semibold">
          <HeroEmblem className="h-4 w-4 shrink-0 text-cloth-500" />
          <span className="truncate">{title}</span>
        </span>
        <HeroGauges hero={shownHero} flashing={flashing} flashKey={flashKey} signature={signature} />
        <CounterChips entityId={heroId} />
        <StatBar
          detail={{
            ...HERO_STAT_DETAILS.cards,
            stats: [
              { label: 'Deck', value: String(hero.deck.length) },
              { label: 'Discard', value: String(hero.discard.length) },
              { label: 'Hand refills to', value: String(hero.refillTarget) },
            ],
          }}
          icon={DeckIcon}
          fillClass="bg-steel-600/80"
          textClass="text-ceramic-300"
          widthClass="w-12"
          label="Cards in deck"
          value={String(hero.deck.length)}
          fraction={ownedCardCount > 0 ? hero.deck.length / ownedCardCount : 0}
        />
      </div>
      <SignatureButton />
    </div>
  )
}

function DeckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="currentColor">
      <rect x="3" y="5" width="9" height="12" rx="1.5" opacity="0.55" />
      <rect x="8" y="3" width="9" height="12" rx="1.5" />
    </svg>
  )
}

import { combatantRef, getCounters, type CounterInstance, type HeroState } from '@/engine'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'
import { signatureControl } from './heroFrame'
import { useDamageFlash } from './useDamageFlash'
import { HeartIcon, HeroEmblem, ShieldIcon } from './icons'
import { HERO_STAT_DETAILS, slotDetail } from './holdDetails'
import { useHold, type HoldDetail } from './HoldPopover'
import { FOCUS_RING_CLASS, GAUGE_FILL_CLASS, GAUGE_LABEL_CLASS, GAUGE_TRACK_CLASS, healthBarScale } from './theme'

// The Hero Frame (D-058, ADR 0033): the primary Hero's persistent readout,
// floating over the board's bottom edge. It absorbed the hero branch of the
// Stat Panel whole — name, health with Armor, Counters, the deck gauge — and
// carries the Signature's face: the resource pips and the one permanent
// ability control the HUD owns beyond the two rails. It never dismisses; a
// tap on Elian's tile pulses it instead of opening a panel. The board never
// resizes for it — at 390 points the board is width-bound and this floats in
// the container's spare height, which is the overlay contract.

// The notification dock stacks upward from this frame's top edge, so the
// layer needs to know how much clearance the frame claims (its height plus
// its bottom margin, in the layer's padding units).
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

// Health and Armor share one bar. Both fills sit on the same scale, and when
// armor lifts the total past max health the scale stretches so the whole
// stack stays inside the track.
function HeroHealthBar({ hero, flashing, flashKey }: { hero: HeroState; flashing: boolean; flashKey: number }) {
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
  return (
    <button
      type="button"
      {...hold.holdProps}
      aria-label={`Health ${hero.health}/${hero.maxHealth}, Armor ${hero.armor}`}
      data-testid="hero-health"
      className={`flex min-h-11 min-w-11 flex-1 items-center justify-center ${FOCUS_RING_CLASS}`}
    >
      <span className={`${GAUGE_TRACK_CLASS} flex-1`}>
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
    </button>
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

// The Signature control: one permanent button that is also the resource
// meter (D-058). The pips are the earned Charge stack; the button ignites
// gold when the Slot can fire right now, holds steel while a bank waits for
// its window, and sits visibly dark while empty — the unlit meter is what
// teaches the earn. A tap fires the fixed Slot through the same store path
// the Action Bar uses.
function SignatureControl() {
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
  return (
    <button
      type="button"
      {...hold.holdProps}
      data-testid="signature-control"
      data-signature-face={face}
      data-charges={charges}
      aria-label={`Signature: ${card.title}, ${charges} of ${cap} ${resourceTitle}${face === 'ready' ? ', ready to fire' : ''}`}
      onClick={() => {
        if (hold.consumeHold()) {
          return
        }
        if (face === 'ready') {
          fireSlot(slotIndex)
        }
      }}
      // The ignition is the "appears" moment: the button never mounts or
      // unmounts, it turns gold. Keyed on the face so entering `ready`
      // remounts the plate and the pop plays once, on that transition only.
      key={face}
      className={`wb-plate wb-plate-sm relative -mt-4 flex min-h-13 min-w-13 shrink-0 flex-col items-center justify-center px-2 pt-1 pb-1.5 ${
        face === 'ready' ? 'wb-pop-in wb-face-gold wb-acc-gold text-gold-950' : 'wb-face-steel wb-acc-none text-ceramic-300'
      } ${face === 'empty' || face === 'spent' ? 'opacity-80' : ''} ${FOCUS_RING_CLASS}`}
    >
      <span className="text-[10px] leading-none font-black tracking-wide uppercase">{card.title}</span>
      <span className="mt-1 flex items-center gap-1" data-testid="signature-pips" aria-hidden="true">
        {Array.from({ length: cap }, (_, index) => (
          <span
            // Keyed by whether it is filled so a fresh earn remounts the new
            // pip and its pop plays exactly once — the frame half of the earn
            // moment; the board half floats at Elian's hex.
            key={`${index}-${index < charges}`}
            className={`h-2 w-3.5 -skew-x-[8deg] ${
              index < charges ? `wb-pop-in ${face === 'ready' ? 'bg-gold-950' : 'bg-gold-400'}` : 'bg-steel-950 shadow-[inset_0_1px_0_rgba(0,0,0,0.6)]'
            }`}
          />
        ))}
      </span>
    </button>
  )
}

export function HeroFrame() {
  const state = useWorkbench(selectState)
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
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-2 pb-1">
      <div
        data-testid="hero-frame"
        // Keyed on the pulse counter: tapping Elian's tile replays the pop,
        // pointing the tap at the chrome that answers it.
        key={pulse}
        className="wb-pop-in wb-plate wb-plate-lg wb-face-ceramic wb-acc-cloth pointer-events-auto flex items-center gap-1 py-1 text-ceramic-950"
      >
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold">
          <HeroEmblem className="h-4 w-4 text-cloth-500" />
          {title}
        </span>
        <HeroHealthBar hero={shownHero} flashing={flashing} flashKey={flashKey} />
        <SignatureControl />
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
          widthClass="w-14"
          label="Cards in deck"
          value={String(hero.deck.length)}
          fraction={ownedCardCount > 0 ? hero.deck.length / ownedCardCount : 0}
        />
      </div>
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

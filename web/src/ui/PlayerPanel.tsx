import { getStatuses, type HeroState, type StatusInstance } from '@/engine'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'
import { useDamageFlash } from './useDamageFlash'
import { HeartIcon, HeroEmblem, PresenceIcon, ShieldIcon } from './icons'
import { HERO_STAT_DETAILS } from './holdDetails'
import { useHold, type HoldDetail } from './HoldPopover'
import { FOCUS_RING_CLASS, GAUGE_FILL_CLASS, GAUGE_LABEL_CLASS, GAUGE_TRACK_CLASS, healthBarScale } from './theme'

// The Hero's line: an emblem, the health gauge, the presence gauge, and the
// deck gauge. Each stat is a filled bar with its number overlaid, so how full
// you are reads at a glance and the exact figure is still right there. Armor
// rides the health bar as an overlay segment — it absorbs damage first, so it
// draws in the same currency, appended after the health fill. What each gauge
// means is a hold away.

// Presence has no hard cap, so its bar fills against a display scale: the
// value a strong round realistically reaches. Past it the bar pins full and
// the number keeps counting.
const PRESENCE_BAR_SCALE = 6

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
function HealthBar({ hero, flashing, flashKey }: { hero: HeroState; flashing: boolean; flashKey: number }) {
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
      className={`flex min-h-11 min-w-11 items-center justify-center ${FOCUS_RING_CLASS}`}
    >
      <span className={`${GAUGE_TRACK_CLASS} w-32`}>
        <span className={`${GAUGE_FILL_CLASS} bg-red-500/70`} style={{ width: `${healthFraction * 100}%` }} />
        <span
          className="absolute inset-y-0 bg-sky-500/70 transition-[left,width] duration-300"
          style={{ left: `${healthFraction * 100}%`, width: `${armorFraction * 100}%` }}
        />
        <span className={`${GAUGE_LABEL_CLASS} text-[10px] text-red-50`}>
          <HeartIcon className="h-3 w-3 shrink-0" />
          <span key={flashKey} className={flashing ? 'wb-damage-flash origin-left' : undefined}>
            {hero.health}/{hero.maxHealth}
          </span>
          {hero.armor > 0 && (
            <>
              <ShieldIcon className="ml-0.5 h-3 w-3 shrink-0 text-sky-300" />
              <span data-testid="hero-armor" className="text-sky-100">
                {hero.armor}
              </span>
            </>
          )}
        </span>
      </span>
    </button>
  )
}

function StatusChip({ status }: { status: StatusInstance }) {
  const hold = useHold({
    id: `status:${status.id}`,
    title: status.title,
    badge: 'Status',
    tone: 'guard',
    stats: [{ label: 'Rounds left', value: String(status.remainingRounds) }],
    text: status.triggerReason,
  })
  return (
    <button
      type="button"
      {...hold.holdProps}
      className={`min-h-11 min-w-11 rounded bg-amber-900 px-1.5 text-[10px] font-semibold text-amber-200 ${FOCUS_RING_CLASS}`}
    >
      {status.title}
    </button>
  )
}

export function PlayerPanel() {
  const state = useWorkbench(selectState)
  const hero = state.heroes[state.primaryHeroId]
  const entity = state.board.entities[state.primaryHeroId]
  // While a boss track replays beat by beat, the gauges show the staggered
  // playout values; the state's numbers are the batch's final ones.
  const override = usePlayout((store) => store.overrides[state.primaryHeroId])
  const shownHealth = override?.health ?? hero?.health ?? 0

  // A hit the player took must be visible even while their eyes are on the
  // board: the number itself flashes, then settles — per beat, when the
  // blow's playout moment arrives.
  const { flashing, flashKey } = useDamageFlash(shownHealth)

  if (!hero) {
    return null
  }
  const shownHero = override ? { ...hero, health: override.health, armor: override.armor ?? hero.armor } : hero
  const statuses = getStatuses(state, state.primaryHeroId)
  // The deck gauge drains against every card the Hero owns, wherever it sits
  // right now: deck, hand, discard, or prepared into a Slot.
  const preparedCount = hero.actionBar.reduce((count, slot) => count + slot.charges.length + (slot.topCard === null ? 0 : 1), 0)
  const ownedCardCount = hero.deck.length + hero.hand.length + hero.discard.length + preparedCount
  return (
    <div className="flex items-center gap-1 border-t border-zinc-800 bg-zinc-900/60 px-3 text-xs" data-testid="player-panel">
      <span className="flex shrink-0 items-center gap-1.5 font-semibold text-zinc-100">
        <HeroEmblem className="h-4 w-4 text-sky-400" />
        {entity?.title ?? hero.id}
      </span>
      <HealthBar hero={shownHero} flashing={flashing} flashKey={flashKey} />
      <StatBar
        detail={HERO_STAT_DETAILS.presence}
        icon={PresenceIcon}
        fillClass="bg-violet-500/70"
        textClass="text-violet-50"
        widthClass="w-14"
        label="Presence"
        value={String(hero.presence)}
        fraction={hero.presence / PRESENCE_BAR_SCALE}
      />
      <div className="ml-auto flex items-center gap-1">
        {statuses.map((status) => (
          <StatusChip key={status.id} status={status} />
        ))}
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
          fillClass="bg-zinc-600/80"
          textClass="text-zinc-200"
          widthClass="w-16"
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

import { useEffect, useRef, useState } from 'react'
import { getStatuses, type StatusInstance } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { HeartIcon, HeroEmblem, PresenceIcon, ShieldIcon } from './icons'
import { HERO_STAT_DETAILS } from './holdDetails'
import { useHold, type HoldDetail } from './HoldPopover'
import { FOCUS_RING_CLASS } from './theme'

// The Hero's line: an emblem, three gauges, and the deck gauge. Each stat is
// a filled bar with its number overlaid, so how full you are reads at a
// glance and the exact figure is still right there. What each gauge means is
// a hold away.

// Armor and Presence have no hard cap, so their bars fill against a display
// scale: the value a strong round realistically reaches. Past it the bar
// pins full and the number keeps counting.
const ARMOR_BAR_SCALE = 10
const PRESENCE_BAR_SCALE = 6

function StatBar({
  detail,
  icon: Icon,
  fillClass,
  textClass,
  widthClass,
  value,
  fraction,
  testId,
  label,
  flashing,
  flashKey,
}: {
  detail: HoldDetail
  icon: typeof HeartIcon
  fillClass: string
  textClass: string
  widthClass: string
  value: string
  fraction: number
  testId?: string
  label: string
  flashing?: boolean
  flashKey?: number
}) {
  const hold = useHold(detail)
  const filled = Math.max(0, Math.min(1, fraction))
  return (
    <button
      type="button"
      {...hold.holdProps}
      aria-label={`${label} ${value}`}
      data-testid={testId}
      className={`flex min-h-11 min-w-11 items-center justify-center ${FOCUS_RING_CLASS}`}
    >
      <span className={`relative block h-[18px] overflow-hidden rounded-sm bg-zinc-800 ${widthClass}`}>
        <span
          className={`absolute inset-y-0 left-0 transition-[width] duration-300 ${fillClass}`}
          style={{ width: `${filled * 100}%` }}
        />
        <span className={`absolute inset-0 flex items-center justify-center gap-1 text-[10px] font-semibold ${textClass}`}>
          <Icon className="h-3 w-3 shrink-0" />
          <span key={flashKey} className={flashing ? 'wb-damage-flash origin-left' : undefined}>
            {value}
          </span>
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

  // A hit the player took must be visible even while their eyes are on the
  // board: the number itself flashes, then settles.
  const previousHealth = useRef(hero?.health ?? 0)
  const [flashKey, setFlashKey] = useState(0)
  const [flashing, setFlashing] = useState(false)
  useEffect(() => {
    const health = hero?.health ?? 0
    if (health < previousHealth.current) {
      setFlashKey((key) => key + 1)
      setFlashing(true)
      const timer = setTimeout(() => setFlashing(false), 500)
      previousHealth.current = health
      return () => clearTimeout(timer)
    }
    previousHealth.current = health
  }, [hero?.health])

  if (!hero) {
    return null
  }
  const statuses = getStatuses(state, state.primaryHeroId)
  // The deck gauge drains against every card the Hero owns, wherever it sits
  // right now: deck, hand, discard, or prepared into a Slot.
  const preparedCount = hero.actionBar.reduce((count, slot) => count + slot.charges.length + (slot.topCard === null ? 0 : 1), 0)
  const librarySize = hero.deck.length + hero.hand.length + hero.discard.length + preparedCount
  return (
    <div className="flex items-center gap-1 border-t border-zinc-800 bg-zinc-900/60 px-3 text-xs" data-testid="player-panel">
      <span className="flex shrink-0 items-center gap-1.5 font-semibold text-zinc-100">
        <HeroEmblem className="h-4 w-4 text-sky-400" />
        {entity?.title ?? hero.id}
      </span>
      <StatBar
        detail={{ ...HERO_STAT_DETAILS.health, stats: [{ label: 'Maximum', value: String(hero.maxHealth) }] }}
        icon={HeartIcon}
        fillClass="bg-red-500/70"
        textClass="text-red-50"
        widthClass="w-24"
        label="Health"
        value={`${hero.health}/${hero.maxHealth}`}
        fraction={hero.maxHealth > 0 ? hero.health / hero.maxHealth : 0}
        testId="hero-health"
        flashing={flashing}
        flashKey={flashKey}
      />
      <StatBar
        detail={HERO_STAT_DETAILS.armor}
        icon={ShieldIcon}
        fillClass="bg-sky-500/70"
        textClass="text-sky-50"
        widthClass="w-14"
        label="Armor"
        value={String(hero.armor)}
        fraction={hero.armor / ARMOR_BAR_SCALE}
        testId="hero-armor"
      />
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
          fraction={librarySize > 0 ? hero.deck.length / librarySize : 0}
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

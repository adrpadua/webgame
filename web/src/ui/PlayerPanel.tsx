import { useEffect, useRef, useState } from 'react'
import { getStatuses, type StatusInstance } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { HeartIcon, HeroEmblem, PresenceIcon, ShieldIcon } from './icons'
import { HERO_STAT_DETAILS } from './holdDetails'
import { useHold, type HoldDetail } from './HoldPopover'
import { FOCUS_RING_CLASS } from './theme'

// The Hero's line: an emblem, three numbers, and the deck count. What each
// number means is a hold away, so the panel stays a glance rather than a
// sentence.

function Stat({
  detail,
  icon: Icon,
  tone,
  value,
  testId,
  label,
  flashing,
  flashKey,
}: {
  detail: HoldDetail
  icon: typeof HeartIcon
  tone: string
  value: string
  testId?: string
  label: string
  flashing?: boolean
  flashKey?: number
}) {
  const hold = useHold(detail)
  return (
    <button
      type="button"
      {...hold.holdProps}
      aria-label={`${label} ${value}`}
      data-testid={testId}
      className={`flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-1 text-xs font-semibold ${tone} ${FOCUS_RING_CLASS}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span key={flashKey} className={flashing ? 'wb-damage-flash origin-left' : undefined}>
        {value}
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
  return (
    <div className="flex items-center gap-1 border-t border-zinc-800 bg-zinc-900/60 px-3 text-xs" data-testid="player-panel">
      <span className="flex shrink-0 items-center gap-1.5 font-semibold text-zinc-100">
        <HeroEmblem className="h-4 w-4 text-sky-400" />
        {entity?.title ?? hero.id}
      </span>
      <Stat
        detail={{ ...HERO_STAT_DETAILS.health, stats: [{ label: 'Maximum', value: String(hero.maxHealth) }] }}
        icon={HeartIcon}
        tone="text-red-400"
        label="Health"
        value={`${hero.health}/${hero.maxHealth}`}
        testId="hero-health"
        flashing={flashing}
        flashKey={flashKey}
      />
      <Stat detail={HERO_STAT_DETAILS.armor} icon={ShieldIcon} tone="text-sky-400" label="Armor" value={String(hero.armor)} testId="hero-armor" />
      <Stat detail={HERO_STAT_DETAILS.presence} icon={PresenceIcon} tone="text-violet-400" label="Presence" value={String(hero.presence)} />
      <div className="ml-auto flex items-center gap-1">
        {statuses.map((status) => (
          <StatusChip key={status.id} status={status} />
        ))}
        <Stat
          detail={{
            ...HERO_STAT_DETAILS.cards,
            stats: [
              { label: 'Deck', value: String(hero.deck.length) },
              { label: 'Discard', value: String(hero.discard.length) },
              { label: 'Hand refills to', value: String(hero.refillTarget) },
            ],
          }}
          icon={DeckIcon}
          tone="text-zinc-500"
          label="Cards in deck"
          value={String(hero.deck.length)}
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

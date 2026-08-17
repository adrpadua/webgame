import { currentProgram, getStatuses, type BoardEntity, type HeroState, type StatusInstance } from '@/engine'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'
import { useDamageFlash } from './useDamageFlash'
import { BossEmblem, HeartIcon, HeroEmblem, ShieldIcon } from './icons'
import { encounterTerms, HERO_STAT_DETAILS } from './holdDetails'
import { useHold, type HoldDetail } from './HoldPopover'
import { FOCUS_RING_CLASS, GAUGE_FILL_CLASS, GAUGE_LABEL_CLASS, GAUGE_TRACK_CLASS, healthBarScale } from './theme'

// The Stat Panel (CONTEXT.md) a tapped tile opens. Persistent gauges left
// the HUD so the board could have the height back: tapping a piece — the
// Boss, the Hero, a Minion — is how its numbers are read now. The panel
// follows the piece, not the hex, and its gauges ride the playout's
// staggered values, so it can sit open through a Boss Row's telling as a
// live readout. It closes from its ✕, from a tap on an empty hex, or with
// the session transitions.

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
        <span className={`${GAUGE_FILL_CLASS} bg-red-500/70`} style={{ width: `${healthFraction * 100}%` }} />
        <span
          className="absolute inset-y-0 bg-glass-500/70 transition-[left,width] duration-300"
          style={{ left: `${healthFraction * 100}%`, width: `${armorFraction * 100}%` }}
        />
        <span className={`${GAUGE_LABEL_CLASS} text-[10px] text-red-50`}>
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
      className={`min-h-11 min-w-11 bg-amber-900 px-1.5 text-[10px] font-semibold text-amber-200 ${FOCUS_RING_CLASS}`}
    >
      {status.title}
    </button>
  )
}

function HeroRows({ heroId }: { heroId: string }) {
  const state = useWorkbench(selectState)
  const hero = state.heroes[heroId]
  const override = usePlayout((store) => store.overrides[heroId])
  const shownHealth = override?.health ?? hero?.health ?? 0
  // A hit must be visible even while the player's eyes are on the board: the
  // number flashes per beat, when the blow's playout moment arrives.
  const { flashing, flashKey } = useDamageFlash(shownHealth)
  if (!hero) {
    return null
  }
  const shownHero = override ? { ...hero, health: override.health, armor: override.armor ?? hero.armor } : hero
  const statuses = getStatuses(state, heroId)
  // The deck gauge drains against every card the Hero owns, wherever it sits
  // right now: deck, hand, discard, or prepared into a Slot.
  const preparedCount = hero.actionBar.reduce((count, slot) => count + slot.charges.length + (slot.topCard === null ? 0 : 1), 0)
  const ownedCardCount = hero.deck.length + hero.hand.length + hero.discard.length + preparedCount
  return (
    <>
      <HeroHealthBar hero={shownHero} flashing={flashing} flashKey={flashKey} />
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
        widthClass="w-14"
        label="Cards in deck"
        value={String(hero.deck.length)}
        fraction={ownedCardCount > 0 ? hero.deck.length / ownedCardCount : 0}
      />
    </>
  )
}

// The Boss or a Minion: one health gauge, override-aware, with the
// Encounter's terms a hold away on the Boss.
function EnemyGauge({ entity, testId, detail }: { entity: BoardEntity; testId?: string; detail: HoldDetail | null }) {
  const override = usePlayout((store) => store.overrides[entity.id])
  const shownHealth = override?.health ?? entity.health
  // Flash the number when damage lands, so a fired attack visibly connects
  // even while the player's eyes are on the Action Bar.
  const { flashing, flashKey } = useDamageFlash(shownHealth)
  const hold = useHold(detail)
  const percent = Math.min(100, Math.max(0, Math.round((shownHealth / entity.maxHealth) * 100)))
  return (
    <button
      type="button"
      {...hold.holdProps}
      aria-label={`${entity.title}, ${shownHealth} of ${entity.maxHealth} health`}
      className={`flex min-h-11 flex-1 items-center ${FOCUS_RING_CLASS}`}
    >
      <span className={`${GAUGE_TRACK_CLASS} flex-1`}>
        <span className={`${GAUGE_FILL_CLASS} bg-linear-to-r from-red-700 to-red-500`} style={{ width: `${percent}%` }} />
        <span className={`${GAUGE_LABEL_CLASS} text-[11px] text-red-50`}>
          <span key={flashKey} className={flashing ? 'wb-damage-flash text-red-300' : undefined} data-testid={testId}>
            {shownHealth} / {entity.maxHealth}
          </span>
        </span>
      </span>
    </button>
  )
}

export function EntityInspect() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const inspectedEntityId = useWorkbench((store) => store.inspectedEntityId)
  const dismissInspect = useWorkbench((store) => store.dismissInspect)
  const entity = inspectedEntityId !== null ? state.board.entities[inspectedEntityId] : undefined
  // A defeated Minion leaves the board; its panel goes with it.
  if (!entity) {
    return null
  }
  const isBoss = entity.id === state.bossId
  const isHero = state.heroes[entity.id] !== undefined
  const bossDetail: HoldDetail | null = isBoss
    ? {
        ...encounterTerms(catalog, state),
        id: 'boss',
        title: entity.title,
        badge: currentProgram(catalog, state)?.title,
      }
    : null
  return (
    <div
      data-testid="entity-inspect"
      data-entity={entity.id}
      className="wb-slide-up wb-plate wb-plate-lg wb-face-steel wb-acc-cloth pointer-events-auto flex items-center gap-1 py-1"
    >
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-zinc-100">
        {/* A Minion is an Enemy, never a Hero: it wears the Enemy emblem in
            its own tone, not the Hero's blue. */}
        {isHero ? (
          <HeroEmblem className="h-4 w-4 text-cloth-300" />
        ) : (
          <BossEmblem className={`h-4 w-4 ${isBoss ? 'text-red-500' : 'text-amber-500'}`} />
        )}
        {entity.title}
      </span>
      {isHero ? <HeroRows heroId={entity.id} /> : <EnemyGauge entity={entity} testId={isBoss ? 'boss-health' : undefined} detail={bossDetail} />}
      <button
        type="button"
        data-testid="inspect-dismiss"
        aria-label="Close the stat panel"
        onClick={dismissInspect}
        className={`min-h-11 min-w-11 shrink-0 text-xs font-bold text-zinc-400 transition hover:text-zinc-100 ${FOCUS_RING_CLASS}`}
      >
        ✕
      </button>
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

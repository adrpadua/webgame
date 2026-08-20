import { useCatalog } from '@/content/CatalogContext'
import { currentProgram, type BoardEntity } from '@/engine'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'
import { useDamageFlash } from '../common/useDamageFlash'
import { BossEmblem } from '../common/icons'
import { StatusIcons } from '../common/StatusIcons'
import { encounterTerms } from '../common/holdDetails'
import { useHold, type HoldDetail } from '../common/HoldPopover'
import { Notify } from './NotificationLayer'
import { FOCUS_RING_CLASS, GAUGE_FILL_CLASS, GAUGE_LABEL_CLASS, GAUGE_TRACK_CLASS } from '../common/theme'

// The Stat Panel (CONTEXT.md) a tapped tile opens — Enemy-only since the
// Hero Frame (D-065): the primary Hero's readout is persistent chrome now,
// and tapping the Hero pulses the frame instead of opening a panel here.
// For the Boss and Minions nothing changed: the panel follows the piece, not
// the hex, its gauges ride the playout's staggered values, and it closes
// from its ✕, a tap on an empty hex, or the session transitions.

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
        <span className={`${GAUGE_FILL_CLASS} bg-linear-to-r from-coral-500 to-coral-400`} style={{ width: `${percent}%` }} />
        <span className={`${GAUGE_LABEL_CLASS} text-[11px] text-coral-100`}>
          <span key={flashKey} className={flashing ? 'wb-damage-flash text-ember-300' : undefined} data-testid={testId}>
            {shownHealth} / {entity.maxHealth}
          </span>
        </span>
      </span>
    </button>
  )
}

export function EntityInspect() {
  const state = useWorkbench(selectState)
  const catalog = useCatalog()
  const inspectedEntityId = useWorkbench((store) => store.inspectedEntityId)
  const dismissInspect = useWorkbench((store) => store.dismissInspect)
  const entity = inspectedEntityId !== null ? state.board.entities[inspectedEntityId] : undefined
  // A defeated Minion leaves the board; its panel goes with it. A Hero never
  // opens one — the Hero Frame is the Hero's readout (D-065) — so anything
  // that still names a Hero here (an old Scenario, a stale id) stays silent.
  if (!entity || state.heroes[entity.id] !== undefined) {
    return null
  }
  const isBoss = entity.id === state.bossId
  const bossDetail: HoldDetail | null = isBoss
    ? {
        ...encounterTerms(catalog, state),
        id: 'boss',
        title: entity.title,
        badge: currentProgram(catalog, state)?.title,
      }
    : null
  // Dark oathsteel housing with an ember channel — a thing you watch. A
  // Minion is a piece of the Boss and takes the same housing at a quieter
  // accent. (The pale ceramic console became the Hero Frame's shell.)
  const shell = isBoss ? 'wb-face-steel wb-acc-ember text-ceramic-200' : 'wb-face-steel wb-acc-none text-ceramic-200'
  // The dock's outermost rank: a readout the player opened deliberately and
  // can reopen with a tap, so it is the one member that yields when the lane
  // is full, and it rides above every prompt rather than under one.
  return (
    <Notify id="stat-panel">
      <div
        data-testid="entity-inspect"
        data-entity={entity.id}
        className={`wb-slide-up wb-plate wb-plate-lg ${shell} pointer-events-auto flex items-center gap-1 py-1`}
      >
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold">
          <BossEmblem className={`h-4 w-4 ${isBoss ? 'text-coral-400' : 'text-coral-500'}`} />
          {entity.title}
        </span>
        <EnemyGauge entity={entity} testId={isBoss ? 'boss-health' : undefined} detail={bossDetail} />
        {/* A Boss or a Minion carries its afflictions on the same panel the
            Hero Frame carries the Hero's boons on: one readout per piece, and
            the same Status Icon tray on both. */}
        <StatusIcons entityId={entity.id} />
        <button
          type="button"
          data-testid="inspect-dismiss"
          aria-label="Close the stat panel"
          onClick={dismissInspect}
          // A live control never dims its own glyph. It carries the shell's
          // colour at full strength and answers the pointer by growing.
          className={`min-h-11 min-w-11 shrink-0 text-xs font-bold transition hover:scale-110 ${FOCUS_RING_CLASS}`}
        >
          ✕
        </button>
      </div>
    </Notify>
  )
}

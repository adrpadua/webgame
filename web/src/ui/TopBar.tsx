import { useEffect, useRef, useState } from 'react'
import { currentProgram } from '@/engine'
import { useOnboarding } from '@/store/onboarding'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'
import { BossEmblem } from './icons'
import { useHold } from './HoldPopover'
import { FOCUS_RING_CLASS, GAUGE_FILL_CLASS, GAUGE_LABEL_CLASS, GAUGE_TRACK_CLASS } from './theme'

// The Boss line: who you are fighting, how much of it is left, and where the
// Round clock stands. Hold it for the Encounter's terms.
export function TopBar() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const openGuide = useOnboarding((store) => store.openGuide)
  const boss = state.board.entities[state.bossId]
  const program = currentProgram(catalog, state)
  // While a boss track replays beat by beat, the gauge shows the staggered
  // playout value; the state's number is the batch's final one.
  const override = usePlayout((store) => store.overrides[state.bossId])
  const bossHealth = override?.health ?? boss?.health ?? 0
  const healthPercent = boss ? Math.min(100, Math.max(0, Math.round((bossHealth / boss.maxHealth) * 100))) : 0
  const hold = useHold({
    id: 'boss',
    title: boss?.title ?? 'Boss',
    badge: program?.title,
    tone: 'boss',
    stats: [
      { label: 'Health', value: `${bossHealth} / ${boss?.maxHealth ?? 0}` },
      { label: 'Round', value: `${state.round} of ${state.roundLimit}` },
    ],
    text: catalog.encounters[state.encounterId]?.rules_text,
    hint: state.enrageText,
  })

  // Flash the boss's numbers when damage lands, so a fired attack visibly
  // connects even while the player's eyes are on the Action Bar. The flash
  // styling clears once the animation finishes, not permanently.
  const previousHealth = useRef(bossHealth)
  const [flashKey, setFlashKey] = useState(0)
  const [flashing, setFlashing] = useState(false)
  useEffect(() => {
    if (bossHealth < previousHealth.current) {
      setFlashKey((key) => key + 1)
      setFlashing(true)
      const timer = setTimeout(() => setFlashing(false), 500)
      previousHealth.current = bossHealth
      return () => clearTimeout(timer)
    }
    previousHealth.current = bossHealth
  }, [bossHealth])

  return (
    <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/80 px-4 py-2">
      <button
        type="button"
        {...hold.holdProps}
        data-testid="boss-bar"
        aria-label={`${boss?.title ?? 'Boss'}, ${bossHealth} of ${boss?.maxHealth ?? 0} health`}
        className={`flex min-h-12 flex-1 items-center gap-2 rounded-lg px-1 text-left ${FOCUS_RING_CLASS}`}
      >
        <BossEmblem className="h-6 w-6 shrink-0 text-red-500" />
        <span className="shrink-0 text-sm font-semibold tracking-wide text-zinc-100">{boss?.title ?? 'Boss'}</span>
        <span className={`${GAUGE_TRACK_CLASS} flex-1`}>
          <span className={`${GAUGE_FILL_CLASS} bg-linear-to-r from-red-700 to-red-500`} style={{ width: `${healthPercent}%` }} />
          <span className={`${GAUGE_LABEL_CLASS} text-[11px] text-red-50`}>
            {/* The colour shift is the flash's reduced-motion fallback: the
                animation is disabled there, the tint is not. */}
            <span key={flashKey} className={flashing ? 'wb-damage-flash text-red-300' : undefined} data-testid="boss-health">
              {bossHealth} / {boss?.maxHealth ?? 0}
            </span>
          </span>
        </span>
      </button>
      <span className="shrink-0 text-[11px] text-zinc-400" data-testid="round-display">
        Round {state.round}/{state.roundLimit}
      </span>
      <button
        type="button"
        data-testid="open-guide"
        onClick={openGuide}
        aria-label="How to play"
        className={`min-h-12 min-w-12 shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 text-sm font-bold text-emerald-400 transition hover:border-emerald-500 hover:text-emerald-300 ${FOCUS_RING_CLASS}`}
      >
        ?
      </button>
    </div>
  )
}

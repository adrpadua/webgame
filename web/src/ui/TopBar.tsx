import { useEffect, useRef, useState } from 'react'
import { currentProgram } from '@/engine'
import { useOnboarding } from '@/store/onboarding'
import { selectState, useWorkbench } from '@/store/workbench'
import { BossEmblem } from './icons'
import { useHold } from './HoldPopover'
import { FOCUS_RING_CLASS } from './theme'

// The Boss line: who you are fighting, how much of it is left, and where the
// Round clock stands. Hold it for the Encounter's terms.
export function TopBar() {
  const state = useWorkbench(selectState)
  const catalog = useWorkbench((store) => store.catalog)
  const openGuide = useOnboarding((store) => store.openGuide)
  const boss = state.board.entities[state.bossId]
  const program = currentProgram(catalog, state)
  const healthPercent = boss ? Math.max(0, Math.round((boss.health / boss.maxHealth) * 100)) : 0
  const hold = useHold({
    id: 'boss',
    title: boss?.title ?? 'Boss',
    badge: program?.title,
    tone: 'boss',
    stats: [
      { label: 'Health', value: `${boss?.health ?? 0} / ${boss?.maxHealth ?? 0}` },
      { label: 'Round', value: `${state.round} of ${state.roundLimit}` },
    ],
    text: catalog.encounters[state.encounterId]?.rules_text,
    hint: state.enrageText,
  })

  // Flash the boss's numbers when damage lands, so a fired attack visibly
  // connects even while the player's eyes are on the Action Bar. The flash
  // styling clears once the animation finishes, not permanently.
  const previousHealth = useRef(boss?.health ?? 0)
  const [flashKey, setFlashKey] = useState(0)
  const [flashing, setFlashing] = useState(false)
  useEffect(() => {
    const health = boss?.health ?? 0
    if (health < previousHealth.current) {
      setFlashKey((key) => key + 1)
      setFlashing(true)
      const timer = setTimeout(() => setFlashing(false), 500)
      previousHealth.current = health
      return () => clearTimeout(timer)
    }
    previousHealth.current = health
  }, [boss?.health])

  return (
    <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/80 px-4 py-2">
      <button
        type="button"
        {...hold.holdProps}
        data-testid="boss-bar"
        aria-label={`${boss?.title ?? 'Boss'}, ${boss?.health ?? 0} of ${boss?.maxHealth ?? 0} health`}
        className={`flex min-h-12 flex-1 items-center gap-2 rounded-lg px-1 text-left ${FOCUS_RING_CLASS}`}
      >
        <BossEmblem className="h-6 w-6 shrink-0 text-red-500" />
        <span className="shrink-0 text-sm font-semibold tracking-wide text-zinc-100">{boss?.title ?? 'Boss'}</span>
        <span className="relative block h-[18px] flex-1 overflow-hidden rounded-sm bg-zinc-800">
          <span
            className="absolute inset-y-0 left-0 bg-linear-to-r from-red-700 to-red-500 transition-[width] duration-500"
            style={{ width: `${healthPercent}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-red-50 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
            <span key={flashKey} className={flashing ? 'wb-damage-flash' : undefined} data-testid="boss-health">
              {boss?.health ?? 0} / {boss?.maxHealth ?? 0}
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

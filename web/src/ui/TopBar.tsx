import { useEffect, useRef, useState } from 'react'
import { useOnboarding } from '@/store/onboarding'
import { selectState, useWorkbench } from '@/store/workbench'
import { BossEmblem } from './icons'
import { FOCUS_RING_CLASS } from './theme'

export function TopBar() {
  const state = useWorkbench(selectState)
  const openGuide = useOnboarding((store) => store.openGuide)
  const boss = state.board.entities[state.bossId]
  const healthPercent = boss ? Math.max(0, Math.round((boss.health / boss.maxHealth) * 100)) : 0

  // Flash the boss's numbers when damage lands, so a fired attack visibly
  // connects even while the player's eyes are on the Action Bar.
  const previousHealth = useRef(boss?.health ?? 0)
  const [flashKey, setFlashKey] = useState(0)
  useEffect(() => {
    const health = boss?.health ?? 0
    if (health < previousHealth.current) {
      setFlashKey((key) => key + 1)
    }
    previousHealth.current = health
  }, [boss?.health])

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
      <div className="flex items-center gap-2">
        <BossEmblem className="h-7 w-7 shrink-0 text-red-500" />
        <span className="text-sm font-semibold tracking-wide text-zinc-100">{boss?.title ?? 'Boss'}</span>
        <span className="ml-auto text-xs text-zinc-400" data-testid="round-display">
          Round {state.round} / {state.roundLimit}
        </span>
        <button
          type="button"
          data-testid="open-guide"
          onClick={openGuide}
          aria-label="How to play"
          className={`min-h-11 min-w-11 rounded-lg border border-zinc-700 bg-zinc-800 text-sm font-bold text-emerald-400 transition hover:border-emerald-500 hover:text-emerald-300 ${FOCUS_RING_CLASS}`}
        >
          ?
        </button>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-linear-to-r from-red-700 to-red-500 transition-all duration-500" style={{ width: `${healthPercent}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
        <span key={flashKey} className={flashKey > 0 ? 'wb-damage-flash origin-left text-red-300' : undefined} data-testid="boss-health">
          {boss?.health ?? 0} / {boss?.maxHealth ?? 0}
        </span>
        <span>Encounter Clock: {state.roundLimit}</span>
      </div>
    </div>
  )
}

import { selectState, useWorkbench } from '@/store/workbench'

export function TopBar() {
  const state = useWorkbench(selectState)
  const boss = state.board.entities[state.bossId]
  const healthPercent = boss ? Math.max(0, Math.round((boss.health / boss.maxHealth) * 100)) : 0
  return (
    <div className="border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold tracking-wide text-zinc-100">{boss?.title ?? 'Boss'}</span>
        <span className="text-xs text-zinc-400" data-testid="round-display">
          Round {state.round} / {state.roundLimit}
        </span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-red-600 transition-all" style={{ width: `${healthPercent}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
        <span data-testid="boss-health">
          {boss?.health ?? 0} / {boss?.maxHealth ?? 0}
        </span>
        <span>Encounter Clock: {state.roundLimit}</span>
      </div>
    </div>
  )
}

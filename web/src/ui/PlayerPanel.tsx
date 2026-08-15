import { getStatuses } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'

export function PlayerPanel() {
  const state = useWorkbench(selectState)
  const hero = state.heroes[state.primaryHeroId]
  const entity = state.board.entities[state.primaryHeroId]
  if (!hero) {
    return null
  }
  const statuses = getStatuses(state, state.primaryHeroId)
  return (
    <div className="flex items-center gap-3 border-t border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs" data-testid="player-panel">
      <span className="font-semibold text-zinc-100">{entity?.title ?? hero.id}</span>
      <span className="text-red-400" data-testid="hero-health">
        HP {hero.health}/{hero.maxHealth}
      </span>
      <span className="text-sky-400" data-testid="hero-armor">
        Armor {hero.armor}
      </span>
      <span className="text-violet-400">Presence {hero.presence}</span>
      <span className="ml-auto text-zinc-500">
        Deck {hero.deck.length} · Discard {hero.discard.length}
      </span>
      {statuses.map((status) => (
        <span key={status.id} className="rounded bg-amber-900 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200" title={status.triggerReason}>
          {status.title}
        </span>
      ))}
    </div>
  )
}

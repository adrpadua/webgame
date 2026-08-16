import { axialAdd, axialDeltaFor, facingName, hexKey, isLegalMove, VALID_FACINGS } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { useFirstTurnStep } from './useFirstTurn'
import { FOCUS_RING_CLASS, SPOTLIGHT_CLASS } from './theme'

// Keyboard- and tap-accessible movement: with a Compact Card selected during
// the Quick Window, one labeled button per legal hex edge moves the Hero
// (discarding the selected card for 1 Stamina), mirroring drag-card-to-hex.
export function MovePad() {
  const state = useWorkbench(selectState)
  const selectedCardId = useWorkbench((store) => store.selectedCardId)
  const cardDroppedOnHex = useWorkbench((store) => store.cardDroppedOnHex)
  const step = useFirstTurnStep()
  if (selectedCardId === null || state.phase !== 'quick' || !state.active) {
    return null
  }
  const heroEntity = state.board.entities[state.primaryHeroId]
  if (!heroEntity) {
    return null
  }
  // While the script is asking for a dodge, only the hexes that answer the
  // telegraph read as live. Dimmed directions drop their pulse: an opacity
  // animation outranks the dimming and would pull the eye the wrong way.
  const safeKeys = new Set(step?.safeHexKeys ?? [])
  return (
    <div className="absolute right-0 bottom-1 left-0 z-10 flex justify-center gap-1" data-testid="move-pad">
      {VALID_FACINGS.map((direction) => {
        const destination = axialAdd(heroEntity.coords, axialDeltaFor(direction))
        const legal = isLegalMove(state.board, state.primaryHeroId, destination)
        const guided = safeKeys.size > 0 && safeKeys.has(hexKey(destination))
        const dimmed = safeKeys.size > 0 && !guided
        return (
          <button
            key={direction}
            type="button"
            disabled={!legal}
            data-testid={`move-${facingName(direction)}`}
            onClick={() => cardDroppedOnHex(selectedCardId, destination)}
            className={`min-h-11 min-w-11 rounded-lg border text-xs font-bold transition ${FOCUS_RING_CLASS} ${
              legal
                ? `border-emerald-500 bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900/80 ${dimmed ? '' : 'animate-pulse motion-reduce:animate-none'}`
                : 'border-zinc-800 bg-zinc-900/70 text-zinc-700'
            } ${guided ? `border-zinc-100 ${SPOTLIGHT_CLASS}` : ''} ${dimmed ? 'opacity-40' : ''}`}
          >
            {facingName(direction)}
          </button>
        )
      })}
    </div>
  )
}

import {
  axialAdd,
  axialDeltaFor,
  facingName,
  hexKey,
  isLegalMove,
  FACING_E,
  FACING_NE,
  FACING_NW,
  FACING_SE,
  FACING_SW,
  FACING_W,
} from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { useFirstTurnStep } from './useFirstTurn'
import { FOCUS_RING_CLASS, SPOTLIGHT_CLASS } from './theme'

// Keyboard- and tap-accessible movement: with a Compact Card selected during
// the Quick Window, one labeled button per legal hex edge moves the Hero
// (discarding the selected card for 1 Stamina), mirroring drag-card-to-hex.
//
// The buttons flank the board rather than sitting under it. The fitted board
// leaves an empty gutter on each side of the play area, so the pad costs no
// board space and covers no hex — and a westward direction reads on the west
// side of the board, which a row of six buttons never managed. The columns
// sit flush with the play-area edges: the gutter runs only a few pixels
// wider than a 44px button, so any inset would put them back over the
// board's outer hexes.
const LEFT_COLUMN = [FACING_NW, FACING_W, FACING_SW]
const RIGHT_COLUMN = [FACING_NE, FACING_E, FACING_SE]

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

  const column = (directions: number[]) => (
    <div className="pointer-events-auto flex flex-col gap-1">
      {directions.map((direction) => {
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
            className={`min-h-11 min-w-11 rounded-lg border text-xs font-bold shadow-lg transition ${FOCUS_RING_CLASS} ${
              legal
                ? `border-glass-500 bg-glass-950/90 text-glass-200 hover:bg-glass-900/90 ${dimmed ? '' : 'animate-pulse motion-reduce:animate-none'}`
                : 'border-zinc-800 bg-zinc-900/80 text-zinc-700'
            } ${guided ? `border-zinc-100 ${SPOTLIGHT_CLASS}` : ''} ${dimmed ? 'opacity-40' : ''}`}
          >
            {facingName(direction)}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between" data-testid="move-pad">
      {column(LEFT_COLUMN)}
      {column(RIGHT_COLUMN)}
    </div>
  )
}

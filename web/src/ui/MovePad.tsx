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
// The pad is one row along the board's bottom edge. The board takes the full
// width of the play surface now, and a hexagonal board leaves a strip below
// its bottom hex row that runs the whole canvas width and is clear to about
// 56px tall — six 44px buttons fit inside it without touching a hex, which
// the smoke suite asserts against the hexes themselves. That is what lets
// the board stop reserving side gutters for the pad, and it puts the pad in
// the thumb zone directly above the Action Bar.
//
// The row keeps the property the side columns had: west directions on the
// left half, east on the right, so a westward move still reads on the west.
// Corner columns were tried first and do not fit — the middle-row hexes
// reach the canvas edge, so a three-button column at x<48 hits hex (-2,0)
// wherever it starts.
const LEFT_ROW = [FACING_NW, FACING_W, FACING_SW]
const RIGHT_ROW = [FACING_SE, FACING_E, FACING_NE]

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

  const row = (directions: number[]) => (
    <div className="flex gap-1">
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
            // The pad is six 44px targets in a gutter only a few pixels wider
            // than 44, so it cannot carry the rake's horizontal padding without
            // overlapping the board — the smoke suite asserts on exactly that.
            // It stays a square steel plate: unrounded, edged, no rake. A legal
            // destination is a player affordance, so it reads in runeglass.
            className={`min-h-11 min-w-11 border text-xs font-bold transition ${FOCUS_RING_CLASS} ${
              legal
                ? `border-glass-500 bg-glass-950/90 text-glass-200 hover:bg-glass-900/90 ${dimmed ? '' : 'animate-pulse motion-reduce:animate-none'}`
                : 'border-steel-800 bg-steel-950/80 text-zinc-700'
            } ${guided ? `border-zinc-100 ${SPOTLIGHT_CLASS}` : ''} ${dimmed ? 'opacity-40' : ''}`}
          >
            {facingName(direction)}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-10" data-testid="move-pad">
      <div className="pointer-events-auto absolute right-0 bottom-1 left-0 flex justify-center gap-1">
        {row(LEFT_ROW)}
        <span aria-hidden="true" className="w-3" />
        {row(RIGHT_ROW)}
      </div>
    </div>
  )
}

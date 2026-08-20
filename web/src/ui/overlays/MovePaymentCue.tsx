import { useEffect } from 'react'
import { axialAdd, axialDeltaFor, axialEquals, facingName, VALID_FACINGS } from '@/engine'
import { selectPilotId, selectState, useWorkbench } from '@/store/workbench'
import { Notify } from './NotificationLayer'
import { FOCUS_RING_CLASS } from '../common/theme'

// Dragging the Hero to a legal hex agrees where to go and says nothing about
// what it costs — but a move is paid for with a discarded hand card (ADR
// 0011), and which card is a real tactical choice. The Hand answers that
// itself: its cards rise and wait, and the one that is tapped is the one
// that burns. This line only names the step and offers the way out, the same
// shape the targeting prompt uses while a Top Card waits for its Minion — a
// popup here would cover the board the player just picked a hex on.
export function MovePaymentCue() {
  const pendingMove = useWorkbench((store) => store.pendingMove)
  const cancelMove = useWorkbench((store) => store.cancelMove)
  const state = useWorkbench(selectState)
  const pilotId = useWorkbench(selectPilotId)

  useEffect(() => {
    if (pendingMove === null) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelMove()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingMove, cancelMove])

  if (pendingMove === null) {
    return null
  }
  const heroCoords = state.board.entities[pilotId]?.coords
  // The destination as a hex edge — the vocabulary the piece labels already
  // use, rather than a pair of coordinates the player never sees anywhere
  // else.
  const direction =
    heroCoords === undefined
      ? undefined
      : VALID_FACINGS.find((facing) => axialEquals(axialAdd(heroCoords, axialDeltaFor(facing)), pendingMove.destination))

  // Docked, because the card that answers it is in the Hand directly below:
  // the prompt and the row it points at are read in one glance.
  return (
    <Notify id="move-payment">
      <div
        className="wb-slide-up wb-plate wb-plate-sm wb-face-steel wb-acc-glass flex min-h-12 items-center justify-between gap-2 py-2 text-xs font-semibold text-glass-200 shadow-lg"
        data-testid="move-payment-cue"
        data-direction={direction === undefined ? '' : facingName(direction)}
      >
        <span className="truncate">Tap a card to step {direction === undefined ? '' : facingName(direction)}</span>
        <button
          type="button"
          data-testid="cancel-move"
          onClick={cancelMove}
          className={`wb-plate wb-plate-sm wb-face-steel wb-acc-none pointer-events-auto min-h-11 shrink-0 font-bold text-ceramic-200 ${FOCUS_RING_CLASS}`}
        >
          Stay put
        </button>
      </div>
    </Notify>
  )
}

import { useEffect, useRef, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import Phaser from 'phaser'
import {
  fireTargeting,
  hexKey,
  isLegalMove,
  minionDetonations,
  neighbors,
  parseHexKey,
  type ContentCatalog,
  type EncounterState,
} from '@/engine'
import { currentFirstTurnStep } from '@/ui/onboarding/useFirstTurn'
import { useOnboarding } from '@/store/onboarding'
import { usePlayout } from '@/store/playout'
import { catalog } from '@/store/catalog'
import { selectPilotId, selectState, useWorkbench } from '@/store/workbench'
import { BoardScene, type BoardSnapshot } from './BoardScene'
import { marksGuardedFront } from './guardedFront'
import { deriveBoardEffects, derivePlayoutScript, type BoardEffect } from './effects'
import { BOARD_HEIGHT, BOARD_WIDTH, pixelToAxial } from './layout'

function buildSnapshot(
  catalog: ContentCatalog,
  state: EncounterState,
  pilotId: string,
  targetingSlotIndex: number | null,
  hoveredHexKey: string | null,
  previewingRoutes: boolean,
  showCoordinates: boolean,
  guidedMoveKeys: string[],
  pendingMoveKey: string | null,
): BoardSnapshot {
  const legalMoveKeys: string[] = []
  // Legal routes light up while dragging a hand card (the paid move) or
  // holding the Hero (the free preview); movement is Quick Window only.
  if (previewingRoutes && state.phase === 'quick' && state.active) {
    const heroEntity = state.board.entities[pilotId]
    if (heroEntity) {
      for (const destination of neighbors(state.board.hexes, heroEntity.coords)) {
        if (isLegalMove(state.board, pilotId, destination)) {
          legalMoveKeys.push(hexKey(destination))
        }
      }
    }
  }
  const targeting =
    targetingSlotIndex === null
      ? null
      : fireTargeting(
          catalog,
          state,
          pilotId,
          targetingSlotIndex,
          hoveredHexKey === null ? undefined : parseHexKey(hoveredHexKey),
        )
  // Piece and ally targets both stand on hexes, so both light their squares;
  // a board_slot target is a Slot on the Action Bar, so the board has nothing
  // to light for it.
  const targetableHexKeys =
    targeting?.mode === 'hex'
      ? targeting.legalHexes.map(hexKey)
      : targeting?.mode === 'piece' || targeting?.mode === 'ally'
        ? targeting.legalTargetIds
            .map((targetId) => state.board.entities[targetId])
            .filter((entity) => entity !== undefined)
            .map((entity) => hexKey(entity.coords))
        : []
  const playout = usePlayout.getState()
  // The Minion fuses that will go off in the next Incoming Row (D-063), read
  // from the live board rather than stored on it. That is what keeps the mark
  // honest: kill the Whelp in the Quick Window and its footprint is gone the
  // same frame, because the projection and the resolution ask the same
  // function the same question.
  const blastHexKeys = minionDetonations(catalog, state).flatMap((blast) => blast.hexes.map(hexKey))
  return {
    state,
    pilotId,
    targetableHexKeys,
    targetPreviewHexKeys: targeting?.previewHexes.map(hexKey) ?? [],
    targetPreviewCenterKey: targeting?.previewHexes.length ? hoveredHexKey : null,
    legalMoveKeys,
    blastHexKeys,
    guardedFront: marksGuardedFront(catalog, state),
    guidedMoveKeys,
    pendingMoveKey,
    showCoordinates,
    pendingScorchKeys: playout.pendingScorchKeys,
    pendingSpawnIds: playout.pendingSpawnIds,
    pendingFacings: playout.pendingFacings,
  }
}

// Where a drag event sits in board space. Measure the canvas, not the
// container: the scaled canvas is letterboxed inside it, so a pointer read
// against the container lands on the wrong hex.
function eventCoords(event: DragEvent<HTMLDivElement> | ReactPointerEvent<HTMLDivElement>) {
  const canvas = event.currentTarget.querySelector('canvas')
  const bounds = (canvas ?? event.currentTarget).getBoundingClientRect()
  const scale = bounds.width / BOARD_WIDTH
  return pixelToAxial((event.clientX - bounds.left) / scale, (event.clientY - bounds.top) / scale)
}

export function PhaserBoard() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scene = new BoardScene({
      onHexClicked: (coords) => useWorkbench.getState().hexClicked(coords),
      onHeroPressChange: (pressed) => useWorkbench.getState().setHeroRoutePreview(pressed),
      onHeroDraggedTo: (destination) => useWorkbench.getState().heroDraggedToHex(destination),
    })
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current ?? undefined,
      transparent: true,
      // The board scales to whatever room the HUD leaves it, keeping its
      // aspect. At a fixed size the outer ring of hexes fell outside the
      // portrait play area — hexes a player could legally step to were not
      // on screen. Scene and layout math stay in board space; only the
      // canvas gets smaller.
      //
      // Horizontally centered, vertically pinned to the top: the width-bound
      // canvas cannot grow into the container's spare height, and centering
      // split that space into two dead bands. Pooled at the bottom it is
      // where the Hero Frame and the dock's prompts live (D-065), below the
      // last hex row instead of over it.
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
      },
      scene,
    })
    // Feedback plays for steps the session just took forward. Stepping back
    // through time travel re-renders in silence: nothing was resolved. The
    // previous entry has to be the same object we last drew, or this is a
    // different timeline — a restart, or a replayed Scenario — rather than
    // one more step along this one.
    let lastEntry = useWorkbench.getState().entries[useWorkbench.getState().index]
    let lastMomentSeq = usePlayout.getState().momentSeq
    const pushSnapshot = () => {
      const store = useWorkbench.getState()
      const step = currentFirstTurnStep()
      const entry = store.entries[store.index]
      const previous = store.entries[store.index - 1]
      const steppedForward = previous !== undefined && previous === lastEntry
      const timelineMoved = entry !== lastEntry
      // lastEntry settles before the playout store is touched: its `begin`
      // notifies subscribers — this function included — and the re-entrant
      // call must not read the step as still-forward and play it twice.
      lastEntry = entry
      let directEffects: BoardEffect[] = []
      if (steppedForward) {
        // A batch with Boss Beats (or one that ended the Encounter) plays
        // through the playout director: one moment per beat, gauges riding
        // along, a Continue prompt between beats — auto-paced during the
        // scripted first turn, which gates its own controls. Anything else
        // is immediate player feedback and goes straight to the board.
        const effects = deriveBoardEffects(catalog, previous.state, entry.state, entry.facts)
        const script = derivePlayoutScript(previous.state, entry.state, entry.facts, effects)
        if (script) {
          usePlayout.getState().begin(script, useOnboarding.getState().firstTurnActive)
        } else {
          usePlayout.getState().clear()
          directEffects = effects
        }
      } else if (timelineMoved) {
        // Time travel, restart, or a replayed Scenario: nothing resolved,
        // so every gauge shows the authoritative state immediately, and
        // feedback still in flight is taken down with them. A blow landing
        // on a board that has jumped out from under it is feedback for a
        // moment that is no longer on screen — and a burn or an expiry left
        // running would go on painting the ground for a Hazard this state
        // does not have. UI-only store changes (a drag, a selection) leave a
        // running playout alone.
        usePlayout.getState().clear()
        scene.clearEffects()
      }
      scene.updateSnapshot(
        buildSnapshot(
          catalog,
          selectState(store),
          selectPilotId(store),
          store.targetingSlotIndex,
          store.hoveredHexKey,
          // A move waiting on its card keeps the routes lit too: the board
          // holds the offer open while the player reads their Hand.
          store.draggingCardId !== null || store.selectedCardId !== null || store.heroRoutePreview || store.pendingMove !== null,
          store.showCoordinates,
          step?.safeHexKeys ?? [],
          store.pendingMove === null ? null : hexKey(store.pendingMove.destination),
        ),
      )
      // The playout director hands each fired moment's effects to the board
      // through a sequence counter, so a moment plays exactly once whether
      // it fired from a timer, a Continue tap, or the batch landing.
      const playoutNow = usePlayout.getState()
      if (playoutNow.momentSeq !== lastMomentSeq) {
        lastMomentSeq = playoutNow.momentSeq
        scene.playEffects(playoutNow.momentEffects)
      }
      if (directEffects.length > 0) {
        scene.playEffects(directEffects)
      }
    }
    const unsubscribe = useWorkbench.subscribe(pushSnapshot)
    // Skipping or finishing the script clears its board highlights too.
    const unsubscribeOnboarding = useOnboarding.subscribe(pushSnapshot)
    // Each playout step redraws the board so held-back hazards, spawns, and
    // facings land with their moments (and each moment's effects fire).
    const unsubscribePlayout = usePlayout.subscribe(pushSnapshot)
    pushSnapshot()
    return () => {
      unsubscribe()
      unsubscribeOnboarding()
      unsubscribePlayout()
      usePlayout.getState().clear()
      game.destroy(true)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      data-testid="board"
      className="h-full w-full"
      // touch-action none keeps hex taps and Hero route-preview presses from
      // scrolling the page on touch devices.
      style={{ touchAction: 'none' }}
      // Phaser owns board clicks; the React wrapper owns hover and drag-over
      // through one canvas-relative mapping. Both therefore stay correct
      // while the fitted canvas catches up to a changing HUD layout.
      onPointerMove={(event) => {
        const coords = eventCoords(event)
        const key = hexKey(coords)
        const onBoard = selectState(useWorkbench.getState()).board.hexes[key] !== undefined
        useWorkbench.getState().setHoveredHex(onBoard ? key : null)
      }}
      onPointerLeave={() => useWorkbench.getState().setHoveredHex(null)}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        // A drag suppresses pointer events, so the scene's own hover report
        // goes quiet for the whole gesture: while a card is in flight this is
        // the only thing that knows which hex it is over.
        const coords = eventCoords(event)
        const key = hexKey(coords)
        const onBoard = selectState(useWorkbench.getState()).board.hexes[key] !== undefined
        useWorkbench.getState().setHoveredHex(onBoard ? key : null)
      }}
      onDragLeave={() => useWorkbench.getState().setHoveredHex(null)}
      onDrop={(event) => {
        event.preventDefault()
        const cardInstanceId = event.dataTransfer.getData('text/plain')
        if (cardInstanceId === '') {
          useWorkbench.getState().setHoveredHex(null)
          return
        }
        useWorkbench.getState().cardDroppedOnHex(cardInstanceId, eventCoords(event))
      }}
    />
  )
}

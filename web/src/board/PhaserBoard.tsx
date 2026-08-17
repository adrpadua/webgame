import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { hexKey, isLegalMove, neighbors, type EncounterState } from '@/engine'
import { currentFirstTurnStep } from '@/ui/useFirstTurn'
import { useOnboarding } from '@/store/onboarding'
import { usePlayout } from '@/store/playout'
import { selectState, useWorkbench } from '@/store/workbench'
import { BoardScene, type BoardSnapshot } from './BoardScene'
import { deriveBoardEffects, derivePlayoutScript, type BoardEffect } from './effects'
import { BOARD_HEIGHT, BOARD_WIDTH, pixelToAxial } from './layout'

function buildSnapshot(
  state: EncounterState,
  targeting: boolean,
  previewingRoutes: boolean,
  showCoordinates: boolean,
  guidedMoveKeys: string[],
): BoardSnapshot {
  const legalMoveKeys: string[] = []
  // Legal routes light up while dragging a hand card (the paid move) or
  // holding the Hero (the free preview); movement is Quick Window only.
  if (previewingRoutes && state.phase === 'quick' && state.active) {
    const heroEntity = state.board.entities[state.primaryHeroId]
    if (heroEntity) {
      for (const destination of neighbors(state.board.hexes, heroEntity.coords)) {
        if (isLegalMove(state.board, state.primaryHeroId, destination)) {
          legalMoveKeys.push(hexKey(destination))
        }
      }
    }
  }
  const playout = usePlayout.getState()
  return {
    state,
    targeting,
    legalMoveKeys,
    guidedMoveKeys,
    showCoordinates,
    pendingScorchKeys: playout.pendingScorchKeys,
    pendingSpawnIds: playout.pendingSpawnIds,
    pendingFacings: playout.pendingFacings,
  }
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
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
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
        const effects = deriveBoardEffects(store.catalog, previous.state, entry.state, entry.facts)
        const script = derivePlayoutScript(previous.state, entry.state, entry.facts, effects)
        if (script) {
          usePlayout.getState().begin(script, useOnboarding.getState().firstTurnActive)
        } else {
          usePlayout.getState().clear()
          directEffects = effects
        }
      } else if (timelineMoved) {
        // Time travel, restart, or a replayed Scenario: nothing resolved,
        // so every gauge shows the authoritative state immediately. UI-only
        // store changes (a drag, a selection) leave a running playout alone.
        usePlayout.getState().clear()
      }
      scene.updateSnapshot(
        buildSnapshot(
          selectState(store),
          store.targetingSlotIndex !== null,
          store.draggingCardId !== null || store.selectedCardId !== null || store.heroRoutePreview,
          store.showCoordinates,
          step?.safeHexKeys ?? [],
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
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(event) => {
        event.preventDefault()
        const cardInstanceId = event.dataTransfer.getData('text/plain')
        if (cardInstanceId === '') {
          return
        }
        // Measure the canvas, not the container: the scaled canvas is
        // letterboxed inside it, so a drop must be read in board space.
        const canvas = event.currentTarget.querySelector('canvas')
        const bounds = (canvas ?? event.currentTarget).getBoundingClientRect()
        const scale = bounds.width / BOARD_WIDTH
        const coords = pixelToAxial((event.clientX - bounds.left) / scale, (event.clientY - bounds.top) / scale)
        useWorkbench.getState().cardDroppedOnHex(cardInstanceId, coords)
      }}
    />
  )
}

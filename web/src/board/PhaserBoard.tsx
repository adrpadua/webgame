import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { hexKey, isLegalMove, neighbors, type EncounterState } from '@/engine'
import { currentFirstTurnStep } from '@/ui/useFirstTurn'
import { useOnboarding } from '@/store/onboarding'
import { selectState, useWorkbench } from '@/store/workbench'
import { BoardScene, type BoardSnapshot } from './BoardScene'
import { deriveBoardEffects } from './effects'
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
  return { state, targeting, legalMoveKeys, guidedMoveKeys, showCoordinates }
}

export function PhaserBoard() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scene = new BoardScene({
      onHexClicked: (coords) => useWorkbench.getState().hexClicked(coords),
      onHeroPressChange: (pressed) => useWorkbench.getState().setHeroRoutePreview(pressed),
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
    const pushSnapshot = () => {
      const store = useWorkbench.getState()
      const step = currentFirstTurnStep()
      scene.updateSnapshot(
        buildSnapshot(
          selectState(store),
          store.targetingSlotIndex !== null,
          store.draggingCardId !== null || store.selectedCardId !== null || store.heroRoutePreview,
          store.showCoordinates,
          step?.safeHexKeys ?? [],
        ),
      )
      const entry = store.entries[store.index]
      const previous = store.entries[store.index - 1]
      if (previous !== undefined && previous === lastEntry) {
        scene.playEffects(deriveBoardEffects(store.catalog, previous.state, entry.state, entry.facts))
      }
      lastEntry = entry
    }
    const unsubscribe = useWorkbench.subscribe(pushSnapshot)
    // Skipping or finishing the script clears its board highlights too.
    const unsubscribeOnboarding = useOnboarding.subscribe(pushSnapshot)
    pushSnapshot()
    return () => {
      unsubscribe()
      unsubscribeOnboarding()
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

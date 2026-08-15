import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { hexKey, isLegalMove, neighbors, type EncounterState } from '@/engine'
import { selectState, useWorkbench } from '@/store/workbench'
import { BoardScene, type BoardSnapshot } from './BoardScene'
import { BOARD_HEIGHT, BOARD_WIDTH, pixelToAxial } from './layout'

function buildSnapshot(
  state: EncounterState,
  targeting: boolean,
  previewingRoutes: boolean,
  showCoordinates: boolean,
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
  return { state, targeting, legalMoveKeys, showCoordinates }
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
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      transparent: true,
      scene,
    })
    const pushSnapshot = () => {
      const store = useWorkbench.getState()
      scene.updateSnapshot(
        buildSnapshot(
          selectState(store),
          store.targetingSlotIndex !== null,
          store.draggingCardId !== null || store.heroRoutePreview,
          store.showCoordinates,
        ),
      )
    }
    const unsubscribe = useWorkbench.subscribe(pushSnapshot)
    pushSnapshot()
    return () => {
      unsubscribe()
      game.destroy(true)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      data-testid="board"
      className="mx-auto"
      // touch-action none keeps hex taps and Hero route-preview presses from
      // scrolling the page on touch devices.
      style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, touchAction: 'none' }}
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
        const bounds = event.currentTarget.getBoundingClientRect()
        const coords = pixelToAxial(event.clientX - bounds.left, event.clientY - bounds.top)
        useWorkbench.getState().cardDroppedOnHex(cardInstanceId, coords)
      }}
    />
  )
}

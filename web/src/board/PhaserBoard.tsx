import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { hexKey, isLegalMove, neighbors, type EncounterState } from '@/engine'
import { useWorkbench } from '@/store/workbench'
import { BoardScene, type BoardSnapshot } from './BoardScene'
import { BOARD_HEIGHT, BOARD_WIDTH, pixelToAxial } from './layout'

function buildSnapshot(state: EncounterState, targeting: boolean, draggingCardId: string | null): BoardSnapshot {
  const legalMoveKeys: string[] = []
  if (draggingCardId !== null && state.phase === 'quick' && state.active) {
    const heroEntity = state.board.entities[state.primaryHeroId]
    if (heroEntity) {
      for (const destination of neighbors(state.board.hexes, heroEntity.coords)) {
        if (isLegalMove(state.board, state.primaryHeroId, destination)) {
          legalMoveKeys.push(hexKey(destination))
        }
      }
    }
  }
  return { state, targeting, legalMoveKeys }
}

export function PhaserBoard() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scene = new BoardScene((coords) => useWorkbench.getState().hexClicked(coords))
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current ?? undefined,
      width: BOARD_WIDTH,
      height: BOARD_HEIGHT,
      transparent: true,
      scene,
    })
    const pushSnapshot = () => {
      const { state, targetingSlotIndex, draggingCardId } = useWorkbench.getState()
      scene.updateSnapshot(buildSnapshot(state, targetingSlotIndex !== null, draggingCardId))
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
      style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
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

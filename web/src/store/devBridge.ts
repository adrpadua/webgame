import { axialToPixel, BOARD_WIDTH, HEX_SIZE } from '@/board/layout'
import { selectState } from './selectors'
import type { useWorkbench } from './workbench'

// Automation hook: the browser smoke and other tools reach the live session
// through the window object. Kept out of the store itself — a store module
// that installs a global on import is a store you cannot import without side
// effects, and none of this is state.

declare global {
  interface Window {
    __workbench?: {
      exportRecord: () => Promise<string>
      exportScenario: () => string
      heroFramePulse: () => number
      bossHealth: () => number
      hazardKeys: () => string[]
      hexRects: () => { key: string; left: number; right: number; top: number; bottom: number }[]
    }
  }
}

export function installDevBridge(store: typeof useWorkbench): void {
  if (typeof window === 'undefined') {
    return
  }
  window.__workbench = {
    exportRecord: () => store.getState().exportRecord(),
    exportScenario: () => store.getState().exportScenario(),
    // The Hero Frame's pulse counter, so a browser check can prove a Hero
    // tap reached the frame (D-065) without reading an animation.
    heroFramePulse: () => store.getState().heroFramePulse,
    // The Boss's live health. The Stat Panel shows it only while open, so a
    // check that wants a before/after around one press would otherwise have
    // to tap the Boss's tile twice and disturb what it is measuring.
    bossHealth: () => {
      const live = selectState(store.getState())
      return live.board.entities[live.bossId]?.health ?? 0
    },
    // Which hexes are carrying ground the rules can see. The Tile Panel opens
    // on a tap, and a browser check has to know which hex to tap: burnt ground
    // is laid by whichever Program the seed dealt, so no fixed coordinate is
    // the burning one twice running.
    hazardKeys: () => {
      const live = selectState(store.getState())
      return Object.entries(live.board.hazards)
        .filter(([, hazards]) => hazards.length > 0)
        .map(([key]) => key)
    },
    // Every hex's on-screen bounding box, so a browser check can ask whether
    // an overlay covers a hex rather than whether it overlaps the canvas —
    // the canvas is a hexagon's bounding box and its corners are empty.
    hexRects: () => {
      const canvas = document.querySelector('[data-testid="board"] canvas')
      const state = selectState(store.getState())
      if (!canvas || !state) {
        return []
      }
      const bounds = canvas.getBoundingClientRect()
      const scale = bounds.width / BOARD_WIDTH
      const half = HEX_SIZE * scale
      return Object.keys(state.board.hexes).map((key) => {
        const [q, r] = key.split(',').map(Number)
        const { x, y } = axialToPixel({ q, r })
        const cx = bounds.left + x * scale
        const cy = bounds.top + y * scale
        return { key, left: cx - half * 0.866, right: cx + half * 0.866, top: cy - half, bottom: cy + half }
      })
    },
  }
}

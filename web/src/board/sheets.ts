import heroIdleUrl from '@/assets/elian-voss-idle.png'
import bossIdleUrl from '@/assets/embermaw-idle.png'
import minionIdleUrl from '@/assets/whelp-idle.png'

// The idle sheets, and the arithmetic that reads a frame out of one.
//
// This lives apart from the scene because two surfaces have to agree about it:
// the board, which draws pieces, and the Sprite Inspector, which exists to
// show what the board would draw. A debug view that carried its own copy of
// the frame size or the row order could show a sheet as correct while the
// game drew it wrong, which is the one failure that makes such a view worse
// than useless.

// Rows are the engine's facing indices, in the order facing.ts numbers them.
export const FACING_ROWS = ['E', 'NE', 'NW', 'W', 'SW', 'SE'] as const

// Columns are one idle loop.
export const IDLE_FRAMES = 4
// Milliseconds per idle frame. Board Ambience: it loops uniformly for every
// piece that has a sheet, carries no state, and stops dead under reduced
// motion.
export const IDLE_MS = 190

export interface SheetSpec {
  key: string
  url: string
  frameWidth: number
  frameHeight: number
  // Rendered height on the board. Pieces are scaled by height rather than
  // drawn at a shared scale: the sheets are cropped to their own content, so
  // a shared scale would size each piece by however much empty space its
  // contact sheet happened to leave around it.
  targetHeight: number
  // How far below the hex centre the piece's base sits, so it stands on the
  // tile rather than floating at its midpoint.
  footOffset: number
}

// Elian stands about one and a third hexes tall. Embermaw is drawn low and
// wide and overlaps its neighbours, which is the design's boss that dominates
// several hexes. A Whelp is roughly half the Hero: it has to read as a piece
// of the furnace that broke off, never as a small Embermaw, and size is half
// of how those two stay apart — the other half is that they share a material
// and separate by saturation, per the board direction.
export const SHEETS: Record<string, SheetSpec> = {
  hero: { key: 'elian-idle', url: heroIdleUrl, frameWidth: 162, frameHeight: 210, targetHeight: 74, footOffset: 12 },
  boss: { key: 'embermaw-idle', url: bossIdleUrl, frameWidth: 238, frameHeight: 176, targetHeight: 80, footOffset: 22 },
  minion: { key: 'whelp-idle', url: minionIdleUrl, frameWidth: 178, frameHeight: 164, targetHeight: 40, footOffset: 10 },
}

// Rows are facings and columns are the idle cycle, so a frame is arithmetic
// rather than a lookup — which is the whole reason the build step reorders
// the artist's rows into the engine's.
export function spriteFrame(facing: number, step: number): number {
  return facing * IDLE_FRAMES + (((step % IDLE_FRAMES) + IDLE_FRAMES) % IDLE_FRAMES)
}

// Where the idle cycle stands at a moment in time. Reduced motion holds it on
// the first frame — the sheet is ambience, and ambience is what that setting
// turns off.
export function idleStep(nowMs: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : Math.floor(nowMs / IDLE_MS) % IDLE_FRAMES
}

import heroIdleUrl from '@/assets/elian-voss-idle.png'
import marenIdleUrl from '@/assets/maren-tallis-idle.png'
import bossIdleUrl from '@/assets/embermaw-idle.png'
import bossPhaseTwoIdleUrl from '@/assets/embermaw-phase-two-idle.png'
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
  heroMaren: { key: 'maren-idle', url: marenIdleUrl, frameWidth: 170, frameHeight: 190, targetHeight: 80, footOffset: 12 },
  boss: { key: 'embermaw-idle', url: bossIdleUrl, frameWidth: 238, frameHeight: 176, targetHeight: 80, footOffset: 22 },
  // Embermaw with its containment shed, from the Phase Trigger onward. Drawn
  // larger in its own contact sheet but at the same aspect, so the same
  // targetHeight lands it at the same size on the board: a phase changes what
  // the Boss does, not how much hex it takes up.
  // Kept on one line like its siblings: the smoke parses this table with a
  // per-line regex, and an entry it cannot see is an entry it cannot check.
  bossPhaseTwo: { key: 'embermaw-phase-two-idle', url: bossPhaseTwoIdleUrl, frameWidth: 326, frameHeight: 240, targetHeight: 80, footOffset: 22 },
  minion: { key: 'whelp-idle', url: minionIdleUrl, frameWidth: 178, frameHeight: 164, targetHeight: 40, footOffset: 10 },
}

// Which sheet a Boss wears. The phase is re-read on every snapshot rather than
// swapped once at the Phase Reveal: a one-time swap is right going forward and
// wrong going back, and stepping through time travel across the Phase Trigger
// has to restore the first form. The last sheet holds for any phase beyond the
// art, which is wrong by one form rather than a Boss with no art at all.
const BOSS_PHASES = ['boss', 'bossPhaseTwo'] as const

// Which sheet a Hero wears. Heroes share a kind, so the sheet is the piece's
// own: an id with authored art gets its body, and every other Hero keeps the
// first sheet rather than rendering as nobody — wrong by one costume, the
// same graceful degradation the Boss's phase mapping chose.
const HERO_SHEETS: Record<string, string> = { maren: 'heroMaren' }

export function heroSheetKey(entityId: string): string {
  return HERO_SHEETS[entityId] ?? 'hero'
}

export function bossSheetKey(bossPhase: number): string {
  const index = Number.isFinite(bossPhase) ? Math.floor(bossPhase) - 1 : 0
  return BOSS_PHASES[Math.min(Math.max(index, 0), BOSS_PHASES.length - 1)]
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

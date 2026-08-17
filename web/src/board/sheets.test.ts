import { describe, expect, it } from 'vitest'
import { FACING_ROWS, IDLE_FRAMES, idleStep, IDLE_MS, SHEETS, spriteFrame } from './sheets'

describe('sprite sheets', () => {
  // The board and the Sprite Inspector both index frames through this, which
  // is the only reason the Inspector is evidence about the game rather than a
  // second drawing of the same art.
  it('indexes a frame as its facing row and its column', () => {
    expect(spriteFrame(0, 0)).toBe(0)
    expect(spriteFrame(0, 3)).toBe(3)
    // Row 3 is W, so its first frame is the fourth row of the sheet.
    expect(spriteFrame(3, 0)).toBe(12)
    expect(spriteFrame(5, 3)).toBe(23)
    // Every facing lands on its own row, in the engine's order.
    for (let facing = 0; facing < FACING_ROWS.length; facing += 1) {
      expect(Math.floor(spriteFrame(facing, 0) / IDLE_FRAMES)).toBe(facing)
    }
  })

  it('wraps the idle cycle rather than running off the row', () => {
    expect(spriteFrame(1, IDLE_FRAMES)).toBe(spriteFrame(1, 0))
    expect(spriteFrame(1, -1)).toBe(spriteFrame(1, IDLE_FRAMES - 1))
  })

  it('holds the cycle still under reduced motion', () => {
    expect(idleStep(IDLE_MS * 3, true)).toBe(0)
    expect(idleStep(IDLE_MS * 3, false)).toBe(3)
    expect(idleStep(IDLE_MS * IDLE_FRAMES, false)).toBe(0)
  })

  // A sheet is sliced by these numbers and nothing in the type system ties
  // them to the file. The smoke checks them against each PNG's header; what
  // is checked here is that a sheet cannot be declared without them.
  it('gives every sheet a frame size and a board size', () => {
    expect(Object.keys(SHEETS).length).toBeGreaterThan(0)
    for (const [kind, sheet] of Object.entries(SHEETS)) {
      expect(sheet.frameWidth, kind).toBeGreaterThan(0)
      expect(sheet.frameHeight, kind).toBeGreaterThan(0)
      expect(sheet.targetHeight, kind).toBeGreaterThan(0)
      expect(sheet.url, kind).toBeTruthy()
    }
  })
})

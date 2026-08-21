import { describe, expect, it } from 'vitest'
import { bossSheetKey, FACING_ROWS, IDLE_FRAMES, idleStep, IDLE_MS, SHEETS, spriteFrame, heroSheetKey } from './sheets'

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

describe('boss phase sheets', () => {
  it('dresses the Boss in the form its phase is in', () => {
    expect(bossSheetKey(1)).toBe('boss')
    expect(bossSheetKey(2)).toBe('bossPhaseTwo')
    expect(SHEETS[bossSheetKey(1)]).toBeDefined()
    expect(SHEETS[bossSheetKey(2)]).toBeDefined()
  })

  // Stepping back across the Phase Trigger has to undress it again. The scene
  // re-reads this every snapshot rather than swapping once at the Phase
  // Reveal, which is what makes time travel work in both directions.
  it('answers by phase alone, not by how the phase was reached', () => {
    expect(bossSheetKey(2)).not.toBe(bossSheetKey(1))
  })

  it('holds the last form for a phase nobody drew', () => {
    expect(bossSheetKey(3)).toBe('bossPhaseTwo')
    expect(bossSheetKey(99)).toBe('bossPhaseTwo')
  })

  it('survives a phase that is out of range or not a number', () => {
    expect(bossSheetKey(0)).toBe('boss')
    expect(bossSheetKey(-2)).toBe('boss')
    expect(bossSheetKey(Number.NaN)).toBe('boss')
  })

  // Both forms are the same creature taking the same ground. A phase changes
  // what the Boss does, not how much hex it occupies.
  it('renders both Boss forms at the same size', () => {
    const one = SHEETS[bossSheetKey(1)]
    const two = SHEETS[bossSheetKey(2)]
    expect(two.targetHeight).toBe(one.targetHeight)
    expect(two.footOffset).toBe(one.footOffset)
    const aspect = (sheet: typeof one) => sheet.frameWidth / sheet.frameHeight
    expect(Math.abs(aspect(two) - aspect(one))).toBeLessThan(0.05)
  })
})

describe('hero sheets', () => {
  it("dresses each Hero in their own body, and a seat without art in Elian's", () => {
    expect(heroSheetKey('maren')).toBe('heroMaren')
    expect(SHEETS[heroSheetKey('maren')]).toBeDefined()
    // The fallback is the shared hero sheet, never a missing key: a new seat
    // renders as somebody on the day it is authored.
    expect(heroSheetKey('elian')).toBe('hero')
    expect(heroSheetKey('someone_unauthored')).toBe('hero')
  })
})

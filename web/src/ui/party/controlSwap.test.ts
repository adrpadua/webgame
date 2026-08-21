import { beforeEach, describe, expect, it } from 'vitest'
import {
  claimFrameBox,
  dealDelay,
  forgetFrameBoxes,
  frameScale,
  invertTransform,
  recordFrameBoxes,
  standingStill,
  CONSOLE_DEAL_LAST_START_MS,
  HAND_DEAL_LEAD_MS,
  HAND_DEAL_STEP_MS,
  SLOT_DEAL_LEAD_MS,
  SLOT_DEAL_STEP_MS,
  type FrameBox,
} from './controlSwap'

// The swap's arithmetic and its handoff, tested away from the browser: the
// two halves that can be wrong in a way a screenshot would not show. What is
// deliberately not here is whether the animation plays — that is a browser
// fact, asserted in the smoke walk.
//
// The boxes are the real ones, measured on the 390pt surface: the primary
// frame is 208pt against the play surface's left padding, and the column is
// 138pt at the same left edge, 64pt higher.

const PRIMARY: FrameBox = { left: 8, top: 782, width: 208 }
const SLOT_ONE: FrameBox = { left: 8, top: 736, width: 138 }
const SLOT_TWO: FrameBox = { left: 8, top: 690, width: 138 }

beforeEach(() => {
  forgetFrameBoxes()
})

describe('the swap transform', () => {
  it('grows the promoted frame from ally size into full size', () => {
    // Standing where the column left it, the primary frame is two thirds of
    // its own width: 138/208. Playing that back to 1 is the growth.
    expect(frameScale(SLOT_ONE, PRIMARY)).toBeCloseTo(0.6635, 4)
    expect(invertTransform(SLOT_ONE, PRIMARY)).toBe('translate(0px, -46px) scale(0.6635)')
  })

  it('shrinks the demoted frame from the primary box into its slot', () => {
    // The other direction is the same claim inverted: the displaced Hero's
    // plate starts wider than the slot it is landing in, and lower down.
    expect(invertTransform(PRIMARY, SLOT_ONE)).toBe('translate(0px, 46px) scale(1.5072)')
  })

  it('travels the difference for an ally that only changed slot', () => {
    // The third seat in a party of three: same Hero, same frame size, a slot
    // further up the column because the swap dropped a different name into it.
    expect(invertTransform(SLOT_ONE, SLOT_TWO)).toBe('translate(0px, 46px) scale(1)')
  })

  it('calls a frame that did not move standing still, and a resize movement', () => {
    expect(standingStill(SLOT_ONE, SLOT_ONE)).toBe(true)
    // Sub-pixel layout noise is not a swap; a scale change is, however small
    // the translate that comes with it.
    expect(standingStill({ ...SLOT_ONE, top: SLOT_ONE.top + 0.25 }, SLOT_ONE)).toBe(true)
    expect(standingStill(SLOT_ONE, SLOT_TWO)).toBe(false)
    expect(standingStill(SLOT_ONE, PRIMARY)).toBe(false)
    expect(standingStill(PRIMARY, SLOT_ONE)).toBe(false)
  })

  it('survives a frame measured at zero width rather than dividing by it', () => {
    expect(frameScale(SLOT_ONE, { left: 0, top: 0, width: 0 })).toBe(1)
  })
})

describe('the console deal', () => {
  const slot = (index: number) => dealDelay(index, SLOT_DEAL_LEAD_MS, SLOT_DEAL_STEP_MS)
  const card = (index: number) => dealDelay(index, HAND_DEAL_LEAD_MS, HAND_DEAL_STEP_MS)

  it('runs down the console: the Action Bar first, the Hand behind it', () => {
    // The two rows are one cascade, not two announcements. Every Slot has
    // started before the first card does, which is what makes the handover
    // read in the direction the eye already travels from the frames.
    expect(slot(0)).toBe(0)
    expect(slot(1)).toBe(45)
    expect(card(0)).toBeGreaterThan(slot(1))
  })

  it('deals each row left to right', () => {
    expect([slot(0), slot(1)]).toEqual([0, 45])
    expect([card(0), card(1), card(2), card(3), card(4)]).toEqual([60, 88, 116, 144, 172])
  })

  it('caps the last start, so a row that grows never turns a handover into a wait', () => {
    // A five-card Hand fits inside the cap with room to spare; the cap is for
    // the row nobody has authored yet.
    expect(card(4)).toBeLessThan(CONSOLE_DEAL_LAST_START_MS)
    expect(card(9)).toBe(CONSOLE_DEAL_LAST_START_MS)
    expect(card(40)).toBe(CONSOLE_DEAL_LAST_START_MS)
    expect(slot(99)).toBe(CONSOLE_DEAL_LAST_START_MS)
  })
})

describe('the handoff', () => {
  it('hands each Hero the box their own frame was standing in', () => {
    recordFrameBoxes([
      ['elian', PRIMARY],
      ['maren', SLOT_ONE],
    ])
    // Maren's box goes to the primary frame, which is now showing Maren, and
    // Elian's to the column plate that now carries Elian. Neither asks which
    // seat it is; both ask where they were.
    expect(claimFrameBox('maren')).toEqual(SLOT_ONE)
    expect(claimFrameBox('elian')).toEqual(PRIMARY)
  })

  it('gives a box away once, so a later render never animates from stale pixels', () => {
    recordFrameBoxes([['maren', SLOT_ONE]])
    expect(claimFrameBox('maren')).toEqual(SLOT_ONE)
    expect(claimFrameBox('maren')).toBeNull()
  })

  it('has nothing for a Hero who was not on screen, and nothing before a press', () => {
    expect(claimFrameBox('maren')).toBeNull()
    recordFrameBoxes([['maren', SLOT_ONE]])
    expect(claimFrameBox('kael')).toBeNull()
  })

  it('drops the previous measurement rather than merging it', () => {
    // Two presses in a row, the first of them unclaimed — a switch the store
    // refused, say. The second press's layout is the only one anything may
    // animate from.
    recordFrameBoxes([
      ['elian', PRIMARY],
      ['maren', SLOT_ONE],
    ])
    recordFrameBoxes([['maren', SLOT_TWO]])
    expect(claimFrameBox('elian')).toBeNull()
    expect(claimFrameBox('maren')).toEqual(SLOT_TWO)
  })
})

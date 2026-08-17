import { describe, expect, it } from 'vitest'
import { boardPalette, TOKENS } from './palette'

// These fallbacks are held against index.css by the smoke suite, which can
// read the stylesheet; this environment cannot. What is checked here is the
// board direction's own rules, which need no stylesheet to state.
describe('the board palette', () => {
  // Warm, most to least imminent: a telegraphed beat landing next window, the
  // Boss, a Minion, then ground that has already burned. The board direction
  // ranks these, and the ranking is the reason the Boss does not take the
  // coral-400 step the chrome gives it — on the board it shares the frame
  // with the beats it is about to land.
  it('ranks the warm side down one ramp by imminence', () => {
    const p = boardPalette()
    const ramp = [TOKENS['coral-300'], TOKENS['coral-400'], TOKENS['coral-500'], TOKENS['coral-700'], TOKENS['coral-900']]
    expect([p.breathOverlay, p.broodOverlay, p.bossFill, p.minionFill, p.scorchedFill]).toEqual(ramp)
  })

  // Ember is damage taken. A Boss drawn in it says the Boss is a wound.
  it('spends no ember on the board', () => {
    const emberSteps = [0xd9482f, 0xe2603f, 0xb53a24]
    for (const value of Object.values(boardPalette())) {
      expect(emberSteps).not.toContain(value)
    }
  })
})

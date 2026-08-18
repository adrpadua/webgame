import { describe, expect, it } from 'vitest'
import { boardPalette, BOSS_SPRITE_WARM_MEDIAN, composite, relativeLuminance, TELEGRAPH_ALPHA, TOKENS } from './palette'

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
    expect([p.coneOverlay, p.spawnOverlay, p.bossFill, p.minionFill, p.scorchedFill]).toEqual(ramp)
  })

  // Ember is damage taken. A Boss drawn in it says the Boss is a wound.
  it('spends no ember on the board', () => {
    const emberSteps = [0xd9482f, 0xe2603f, 0xb53a24]
    for (const value of Object.values(boardPalette())) {
      expect(emberSteps).not.toContain(value)
    }
  })

  // The ranking above is a ranking of tokens, and the player never sees a
  // token. A telegraph is a tint: it is composited over the tile, which costs
  // it most of its chroma and most of its luminance. Ranking correctly in the
  // ramp and wrongly on screen is exactly the defect this checks for — at the
  // alphas the board first shipped, the Boss sprite outranked both telegraphs.
  describe('what the player actually sees', () => {
    const rendered = boardPalette()
    const cone = composite(rendered.coneOverlay, TELEGRAPH_ALPHA.cone, rendered.tileFill)
    const spawn = composite(rendered.spawnOverlay, TELEGRAPH_ALPHA.spawn, rendered.tileFill)

    it('ranks the rendered warm side by imminence, not just the ramp', () => {
      const order = [
        relativeLuminance(cone),
        relativeLuminance(spawn),
        BOSS_SPRITE_WARM_MEDIAN,
        relativeLuminance(rendered.minionFill),
        relativeLuminance(rendered.scorchedFill),
      ]
      expect(order).toEqual([...order].sort((a, b) => b - a))
    })

    // The Boss is drawn art and no runtime tint governs it, so it is the one
    // step that cannot be corrected by moving a token. The telegraphs are what
    // must clear it.
    it('keeps both telegraphs above the Boss sprite', () => {
      expect(relativeLuminance(cone)).toBeGreaterThan(BOSS_SPRITE_WARM_MEDIAN)
      expect(relativeLuminance(spawn)).toBeGreaterThan(BOSS_SPRITE_WARM_MEDIAN)
    })

    // Two telegraphs share the board and mean different things. They were 7.5
    // dE apart once, which is a difference a player cannot act on.
    it('separates the cone from the spawn by more than a hair', () => {
      expect(relativeLuminance(cone) / relativeLuminance(spawn)).toBeGreaterThan(1.4)
    })
  })
})

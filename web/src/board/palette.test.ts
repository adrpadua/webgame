import { describe, expect, it } from 'vitest'
import { boardPalette, BLAST_EDGE, BOSS_SPRITE_WARM_MEDIAN, composite, HOT_SHADE, relativeLuminance, shade, TELEGRAPH_ALPHA, TOKENS } from './palette'

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
    it('keeps both filled telegraphs above the Boss sprite', () => {
      expect(relativeLuminance(cone)).toBeGreaterThan(BOSS_SPRITE_WARM_MEDIAN)
      expect(relativeLuminance(spawn)).toBeGreaterThan(BOSS_SPRITE_WARM_MEDIAN)
    })

    // The blast is the third telegraph and the one that ranks on its edge
    // instead of its fill, because it covers up to ten of nineteen hexes and a
    // fill at cone strength would make most of the arena the warning. So the
    // bound moves to the line: drawn at the token's own full alpha, it is the
    // brightest warm thing on the board, well clear of the Boss sprite.
    //
    // The wash under it is held to the other half of that bargain — quiet
    // enough not to compete with a piece or with the spawn telegraph, loud
    // enough to say which ground is inside the line. Both ends are asserted,
    // because a wash that drifted up would flood the board and one that
    // drifted down would leave the line enclosing nothing legible.
    it('puts the blast’s warning in its edge and keeps the wash under it quiet', () => {
      const wash = composite(rendered.blastOverlay, TELEGRAPH_ALPHA.blast, rendered.tileFill)
      expect(relativeLuminance(rendered.blastOverlay)).toBeGreaterThan(relativeLuminance(cone))
      expect(BLAST_EDGE.alpha).toBe(1)
      expect(relativeLuminance(wash)).toBeLessThan(BOSS_SPRITE_WARM_MEDIAN)
      expect(relativeLuminance(wash)).toBeLessThan(relativeLuminance(spawn))
      expect(relativeLuminance(wash) / relativeLuminance(rendered.tileFill)).toBeGreaterThan(3)
    })

    // The blast takes the cone's step on purpose: the ramp ranks by imminence,
    // and a blast going off in the Incoming Row is exactly as imminent as the
    // breath burning in it. Asserted rather than left to a comment, because
    // the alternative — quietly drifting onto the spawn's step, or onto a
    // sixth warm value nobody authored — is what this whole module exists to
    // catch. What separates the two marks is shape, which a colour test cannot
    // see; if this pair is ever pulled apart, the reason belongs here.
    it('gives the blast the cone’s step, and leans on shape to separate them', () => {
      expect(rendered.blastOverlay).toBe(rendered.coneOverlay)
    })

    // Two telegraphs share the board and mean different things. They were 7.5
    // dE apart once, which is a difference a player cannot act on.
    it('separates the cone from the spawn by more than a hair', () => {
      expect(relativeLuminance(cone) / relativeLuminance(spawn)).toBeGreaterThan(1.4)
    })

    // The top of the warm order is the beat resolving now, and two of them are
    // drawn as a hot value of the material rather than as a token of their
    // own: the core of a flame, and the break a Minion comes up through. Both
    // land on the hex that was warning about them — ash inside the Cinder
    // Breath cone, a Whelp on its own spawn mark — so a hot value that failed
    // to clear its telegraph would leave the event reading as part of its own
    // warning.
    it('burns hotter than the telegraph each of those beats lands on', () => {
      const flameCore = shade(rendered.spawnOverlay, HOT_SHADE.flameCore)
      const spawnBreak = shade(rendered.bossFill, HOT_SHADE.spawnBreak)
      expect(relativeLuminance(flameCore)).toBeGreaterThan(relativeLuminance(cone))
      expect(relativeLuminance(spawnBreak)).toBeGreaterThan(relativeLuminance(spawn))
      // And both stay warm doing it: a value driven so hard it arrives white
      // has left the material behind.
      for (const hot of [flameCore, spawnBreak]) {
        expect((hot >> 16) & 0xff).toBeGreaterThan(hot & 0xff)
      }
    })
  })
})

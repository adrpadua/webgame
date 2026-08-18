// The board's palette, read from the same tokens the chrome wears.
//
// The board paints to a canvas, so it cannot take a Tailwind class the way a
// plate can — but it must not keep a second, private copy of the palette
// either. That is exactly how the Boss token came to be drawn in ember here
// while every plate in the interface drew it in ember coral: two lists of the
// same colours, and only one of them got corrected. Each value below names
// the token it is and resolves from the stylesheet at scene boot, so moving a
// ramp in index.css moves the board with it.
//
// The literals are fallbacks for a context with no document (the headless
// runner imports this module's siblings) and must stay equal to the tokens
// they name; a mismatch means the stylesheet moved and this line did not.

// Token name -> the value it holds at the time of writing. Exported so a test
// can hold this list against index.css: a fallback that has drifted from its
// token is the same defect this module exists to end.
export const TOKENS = {
  'steel-700': 0x37465f,
  'steel-900': 0x1b2434,
  'cloth-500': 0x2f5680,
  'glass-400': 0x62d2e6,
  'coral-300': 0xec9569,
  'coral-400': 0xe0703b,
  'coral-500': 0xc4522a,
  'coral-700': 0x7e3519,
  'coral-900': 0x45200f,
  'ember-100': 0xf6c9be,
  'ceramic-100': 0xf7f9fb,
  'ceramic-300': 0xe4e8ee,
} as const

type TokenName = keyof typeof TOKENS

function readToken(name: TokenName): number {
  if (typeof document === 'undefined') {
    return TOKENS[name]
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()
  const hex = /^#([0-9a-f]{6})$/i.exec(raw)
  return hex ? parseInt(hex[1], 16) : TOKENS[name]
}

export interface BoardPalette {
  tileFill: number
  tileStroke: number
  heroFill: number
  moveOverlay: number
  coneOverlay: number
  spawnOverlay: number
  bossFill: number
  minionFill: number
  scorchedFill: number
  guidedStroke: number
  targetStroke: number
}

// Cool objects and cool tints are yours: oathsteel ground, a signal-cloth
// Hero standing on it, runeglass for anything you may choose.
//
// The warm side is one material — ember coral — stepped down the ramp in the
// order the board direction ranks imminence: a telegraphed beat landing next
// window, then the Boss, then a Minion, then ground that has already burned.
// Two telegraphs are on the board at once and the cone is the more imminent
// read, so it takes the brighter step and the spawn telegraph the next.
//
// The Boss sits below both telegraphs rather than at coral-400, which is the
// step the chrome gives it. On a plate the Boss is the only warm thing in
// view; on the board it competes with the beats it is about to land, and the
// direction ranks those above it. Ember is absent here on purpose — the
// interface direction spends that material on damage taken, and a Boss drawn
// in it says the Boss is a wound.
export function boardPalette(): BoardPalette {
  return {
    tileFill: readToken('steel-900'),
    tileStroke: readToken('steel-700'),
    heroFill: readToken('cloth-500'),
    moveOverlay: readToken('glass-400'),
    coneOverlay: readToken('coral-300'),
    spawnOverlay: readToken('coral-400'),
    bossFill: readToken('coral-500'),
    minionFill: readToken('coral-700'),
    scorchedFill: readToken('coral-900'),
    // The scripted turn's pointer is instruction from outside the fiction and
    // is the one neutral on the board; aether ceramic is the palette's white.
    guidedStroke: readToken('ceramic-100'),
    targetStroke: readToken('glass-400'),
  }
}

// A Board Feedback flash is an event, neither object nor tint: the axis says
// whose event it was, and the material involved supplies the value. Your
// restoration is aether ceramic — the world's medical technology — and reads
// pale against a board where everything else is saturated. There is no green
// on the board, because green names no material.
export function toneColors(): Record<'hero' | 'boss' | 'guard' | 'heal' | 'hazard', number> {
  return {
    hero: readToken('cloth-500'),
    boss: readToken('coral-500'),
    guard: readToken('glass-400'),
    heal: readToken('ceramic-300'),
    hazard: readToken('coral-400'),
  }
}

// How strongly a telegraph is painted over the tile, and the reason it is not
// a number someone liked the look of.
//
// A telegraph is a tint, not a fill, so what the player sees is the composite
// rather than the token. Compositing a saturated coral onto a dark oathsteel
// tile at low alpha destroys most of its chroma: at the 28% and 32% this once
// used, coral-300 arrived at C*=8 and coral-400 at C*=15, against the C*=63
// the token carries. A warning that lands as grey-brown is not a warning, and
// the two telegraphs were 7.5 dE apart, which is close to indistinguishable.
//
// The board direction ranks warm by imminence, and the ranking has to hold in
// what reaches the screen. Measured, the Boss sprite's warm pixels sit at a
// median luminance of 0.1036 — it is drawn art and no runtime tint governs it,
// so the telegraphs are what must be lifted above it. These alphas are solved
// against that number rather than chosen: they put the cone at L=0.219 and the
// spawn at L=0.117, both clear of the Boss, 13.7 dE apart, and carrying three
// to four times the chroma they did.
export const TELEGRAPH_ALPHA = { cone: 0.7, spawn: 0.58 } as const

// The measured warm median of the Boss sprite, which the telegraphs have to
// clear. Taken from facing E; the whole sheet reads 0.1033, and the higher
// figure is kept because it makes the bound the stricter of the two. The smoke
// suite measures the shipped sheet itself and holds it under both telegraph
// composites, so a hotter Boss fails there rather than quietly retaking the
// top of the ranking.
export const BOSS_SPRITE_WARM_MEDIAN = 0.1036

// Scales a 0xRRGGBB colour's channels toward black (factor < 1) or white
// (factor > 1), so one authored colour yields its own shadow and highlight
// instead of needing a second constant per tone. Above 1 the channels run into
// their ceiling red first, which is why a hot value rides up toward white
// rather than sideways into a hue nobody authored.
export function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor))
  const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor))
  const b = Math.min(255, Math.round((color & 0xff) * factor))
  return (r << 16) | (g << 8) | b
}

// Where the board draws something hotter than the material it is made of: the
// core of a flame, the break a Minion comes up through, and the light coming
// out of a Boss as it goes out.
//
// Each is a beat resolving now, which the board direction puts at the top of
// the warm order — above the telegraph that announced it. Ash usually lands
// inside the Cinder Breath cone and a spawn always lands on the mark that
// warned about it, so a hot value failing to clear its own telegraph would
// leave the event reading as part of its own warning. palette.test.ts holds
// the two that land on a telegraph to exactly that, because a ranking nobody
// asserts is a ranking that drifts. (A Boss going out lands on no telegraph:
// nothing warns that the fight is about to end.)
export const HOT_SHADE = { flameCore: 1.7, spawnBreak: 1.45 } as const

// A tint over a tile, as the player sees it. Straight source-over compositing,
// which is what Phaser's fillStyle alpha does.
export function composite(tint: number, alpha: number, over: number): number {
  const mix = (shift: number): number => {
    const top = (tint >> shift) & 0xff
    const bottom = (over >> shift) & 0xff
    return Math.round(alpha * top + (1 - alpha) * bottom)
  }
  return (mix(16) << 16) | (mix(8) << 8) | mix(0)
}

// Relative luminance, sRGB. The board's warm ordering is an ordering of what
// the eye receives, so it is checked in light rather than in hex digits.
export function relativeLuminance(color: number): number {
  const channel = (shift: number): number => {
    const value = ((color >> shift) & 0xff) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0)
}

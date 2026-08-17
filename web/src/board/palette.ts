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
  breathOverlay: number
  broodOverlay: number
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
// Two telegraphs are on the board at once and the breath cone is the more
// imminent read, so it takes the brighter step and the Brood Call the next.
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
    breathOverlay: readToken('coral-300'),
    broodOverlay: readToken('coral-400'),
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

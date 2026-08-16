// Shared presentation tokens for the portrait play surface and debug rail.

// One frame height, one owner: the play surface and the rail beside it.
export const FRAME_HEIGHT_CLASS = 'h-[840px]'

// The color language for a Top Card's window speed, used wherever a card's
// timing is shown (Compact Cards, Slots, Card Inspection).
export function windowToneClass(windowSpeed: 'quick' | 'slow'): string {
  return windowSpeed === 'quick' ? 'text-emerald-400' : 'text-sky-400'
}

// The same language as a filled dot, for places that show timing without
// spelling it out. Written as whole class names so Tailwind can see them.
export function windowDotClass(windowSpeed: 'quick' | 'slow'): string {
  return windowSpeed === 'quick' ? 'bg-emerald-400' : 'bg-sky-400'
}

// The gauge language, written once: a dark track, a fill measured from the
// left, and the number overlaid with a shadow so it stays crisp where it
// straddles the fill edge. The Boss line and the Hero's panel both speak it.
export const GAUGE_TRACK_CLASS = 'relative block h-[18px] overflow-hidden rounded-sm bg-zinc-800'
export const GAUGE_FILL_CLASS = 'absolute inset-y-0 left-0 transition-[width] duration-300'
export const GAUGE_LABEL_CLASS = 'absolute inset-0 flex items-center justify-center gap-1 font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]'

// Armor rides a health bar in the same currency: when the stack exceeds max
// health the track's scale stretches so both fills stay inside it. Shared by
// the Hero's panel gauge and the board's mini-bars.
export function healthBarScale(health: number, maxHealth: number, armor: number): number {
  return Math.max(maxHealth, health + armor, 1)
}

// Visible keyboard focus (accessibility contract): applied to every
// interactive control on the play surface.
export const FOCUS_RING_CLASS = 'focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none'

// While the scripted first turn runs, everything the current step did not
// name goes quiet and inert — one live control at a time.
export const GATED_CLASS = 'pointer-events-none opacity-30 saturate-50'

// ...and the control it did name wears the pulsing ring.
export const SPOTLIGHT_CLASS = 'wb-glow-ring'

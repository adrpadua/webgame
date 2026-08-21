// Shared presentation tokens for the portrait play surface and debug rail.

// One frame height, one owner: the play surface and the rail beside it.
// Phones fill the dynamic viewport — dvh tracks the browser chrome as it
// collapses, so the Hand is on screen without scrolling. The min height is
// the floor under the stacked HUD: on a shorter viewport (phone landscape)
// the page scrolls rather than crushing the controls. From `sm` up the
// frame is the fixed portrait canvas beside the debug rail, as before.
export const FRAME_HEIGHT_CLASS = 'h-dvh min-h-[600px] sm:h-[840px] sm:min-h-0'

// The color language for a Top Card's window speed, used wherever a card's
// timing is shown (Compact Cards, Slots, Card Inspection). Quick is runeglass
// — hard-light, immediate; Slow is living gold — the mechanism you wind up.
// Both are materials from docs/content/oathcraft-interface-direction.md.
export function windowToneClass(windowSpeed: 'quick' | 'slow'): string {
  return windowSpeed === 'quick' ? 'text-glass-400' : 'text-gold-400'
}

// The same language as a filled dot, for places that show timing without
// spelling it out. Written as whole class names so Tailwind can see them.
export function windowDotClass(windowSpeed: 'quick' | 'slow'): string {
  return windowSpeed === 'quick' ? 'bg-glass-400' : 'bg-gold-400'
}

// The gauge language, written once: a dark track, a fill measured from the
// left, and the number overlaid with a shadow so it stays crisp where it
// straddles the fill edge. The Boss line and the Hero's panel both speak it.
export const GAUGE_TRACK_CLASS = 'relative block h-[18px] overflow-hidden rounded-sm bg-steel-950'
export const GAUGE_FILL_CLASS = 'absolute inset-y-0 left-0 transition-[width] duration-300'
export const GAUGE_LABEL_CLASS = 'absolute inset-0 flex items-center justify-center gap-1 font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]'

// Armor rides a health bar in the same currency: when the stack exceeds max
// health the track's scale stretches so both fills stay inside it. Shared by
// the Hero's panel gauge and the board's mini-bars.
export function healthBarScale(health: number, maxHealth: number, armor: number): number {
  return Math.max(maxHealth, health + armor, 1)
}

// Visible keyboard focus (accessibility contract): applied to every
// interactive control on the play surface. Focus is a projected lens, so it
// is runeglass rather than a status colour.
export const FOCUS_RING_CLASS = 'focus-visible:ring-2 focus-visible:ring-glass-400 focus-visible:outline-none'

// While the scripted first turn runs, everything the current step did not
// name goes quiet and inert — one live control at a time.
export const GATED_CLASS = 'pointer-events-none opacity-30 saturate-50'

// ...and the control it did name wears the pulsing ring.
export const SPOTLIGHT_CLASS = 'wb-glow-ring'

// The same living-gold ring, worn by the rail while a party member still owes
// this window an action. One spelling, two callers: the ring means "the press
// this interface is waiting for is here", and a second gold bloom for the same
// sentence would only teach the player that gold rings mean nothing in
// particular. The two never overlap — the scripted first turn is solo.
export const NUDGE_RING_CLASS = 'wb-glow-ring'

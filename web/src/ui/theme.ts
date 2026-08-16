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

// Visible keyboard focus (accessibility contract): applied to every
// interactive control on the play surface.
export const FOCUS_RING_CLASS = 'focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none'

// While the scripted first turn runs, everything the current step did not
// name goes quiet and inert — one live control at a time.
export const GATED_CLASS = 'pointer-events-none opacity-30 saturate-50'

// ...and the control it did name wears the pulsing ring.
export const SPOTLIGHT_CLASS = 'wb-glow-ring'

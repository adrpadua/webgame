// Shared presentation tokens for the portrait play surface and debug rail.

// One frame height, one owner: the play surface and the rail beside it.
export const FRAME_HEIGHT_CLASS = 'h-[840px]'

// The color language for a Top Card's window speed, used wherever a card's
// timing is shown (Compact Cards, Slots, Card Inspection).
export function windowToneClass(windowSpeed: 'quick' | 'slow'): string {
  return windowSpeed === 'quick' ? 'text-emerald-400' : 'text-sky-400'
}

// Visible keyboard focus (accessibility contract): applied to every
// interactive control on the play surface.
export const FOCUS_RING_CLASS = 'focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none'

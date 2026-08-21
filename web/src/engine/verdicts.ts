import type { LegalityVerdict } from './types'

// The verdict grammar shared by the legality module's implementation files —
// `legality.ts` (the public seam and the per-command validators) and
// `fireLegality.ts` (the fire_slot targeting cluster). Internal to that
// module: nothing outside it should build verdicts by hand, because the one
// place that decides what legal means is the `legality()` seam.

export function legal(): LegalityVerdict {
  return { legal: true, reason: '' }
}

export function illegal(reason: string): LegalityVerdict {
  return { legal: false, reason }
}

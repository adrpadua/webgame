import type { SubscriberMatch } from './events'
import type { ResolvedActionFact } from './types'

// The fact grammar shared by the resolver's implementation files —
// `resolve.ts` (the recursion and the ordinary cases) and `firedCard.ts`
// (the fired-card module). The same shape as `verdicts.ts` on the legality
// side: a tiny shared vocabulary so the seam between the resolver and its
// one deep extracted case never needs a circular import.

export function succeed(fact: ResolvedActionFact): void {
  fact.succeeded = true
  fact.reason = ''
}

export function fail(fact: ResolvedActionFact, reason: string): void {
  fact.succeeded = false
  fact.reason = reason
}

// Matched subscribers ride the raising action's record only when at least
// one matched; a raise nothing heard records nothing (ADR 0041).
export function recordSubscriberMatches(detail: Record<string, unknown>, matches: SubscriberMatch[]): void {
  if (matches.length > 0) {
    // Append, never assign: one action can carry several raises — a traversal
    // raises hex_entered once per hex it crosses (D-086) — and each records
    // onto the same fact.
    const existing = Array.isArray(detail.subscriber_matches) ? (detail.subscriber_matches as SubscriberMatch[]) : []
    detail.subscriber_matches = [...existing, ...matches]
  }
}

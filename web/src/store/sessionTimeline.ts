import type { EncounterState, ResolvedActionFact, ScenarioStep } from '@/engine'

// The session timeline: the data model the Workbench store is built around,
// and the pure functions that read it. Nothing here touches zustand, so the
// timeline's rules — how facts are numbered, where an undo lands — are
// testable as arithmetic over entries rather than as a running session.

export interface FactEntry extends ResolvedActionFact {
  id: number
}

// One position on the session timeline: the state after a step, the facts
// that step produced, and the step itself (null for the seeded start).
// Time travel walks these entries; submitting from an earlier position
// branches by truncating the future, exactly like replaying a shorter prefix.
export interface HistoryEntry {
  label: string
  step: ScenarioStep | null
  state: EncounterState
  facts: FactEntry[]
}

// The two fields every timeline reader needs, so a selector can be handed a
// fixture rather than the whole store.
export interface TimelinePosition {
  entries: HistoryEntry[]
  index: number
}

// Fact ids run globally across the timeline; both live play and Scenario
// replay number through these two helpers.
export function numberFacts(firstId: number, produced: ResolvedActionFact[]): FactEntry[] {
  return produced.map((fact, offset) => ({ ...fact, id: firstId + offset }))
}

export function nextFactId(entries: HistoryEntry[], index: number): number {
  for (let position = index; position >= 0; position -= 1) {
    const facts = entries[position].facts
    if (facts.length > 0) {
      return facts[facts.length - 1].id + 1
    }
  }
  return 1
}

// Where an undo would land, or null when there is nothing of the player's
// own left to take back.
//
// The rule is a window, not a step count. A Boss Row's beats and a phase
// advance are not the player's to rewind — the Round is the Boss's clock and
// taking a beat back would make the Escalation it drives negotiable — so the
// walk stops the moment it reaches the entry an advance produced, and the
// rail greys there. That entry is also the window's own floor, which is why
// no phase bookkeeping is needed: an action still on the timeline above the
// last advance is by definition an action taken in the open window.
//
// A refused action left the state exactly as it found it, so the walk steps
// over it rather than spending a press on it: one press takes back one thing
// that actually happened.
export function selectUndoTarget(position: TimelinePosition): number | null {
  let target = position.index
  while (target > 0) {
    const entry = position.entries[target]
    if (entry.step === null || !('action' in entry.step)) {
      return null
    }
    target -= 1
    if (entry.facts.some((fact) => fact.succeeded)) {
      return target
    }
  }
  return null
}

export const selectCanUndo = (position: TimelinePosition): boolean => selectUndoTarget(position) !== null

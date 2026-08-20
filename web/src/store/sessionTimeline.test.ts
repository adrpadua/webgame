import { describe, expect, it } from 'vitest'
import type { EncounterState, ResolvedActionFact } from '@/engine'
import { nextFactId, numberFacts, type HistoryEntry } from './sessionTimeline'

// Fact ids are the Encounter Record's spine: a Record is a stream of numbered
// facts, and a replay lines its own facts up against them. So the numbering
// has one rule — it runs forward across the whole timeline, never restarting
// and never reusing — and these are the shapes that could break it.

const STATE = {} as EncounterState

function fact(title: string): ResolvedActionFact {
  return { title } as ResolvedActionFact
}

function entry(facts: { id: number }[]): HistoryEntry {
  return { label: 'Fire Slot', step: null, state: STATE, facts: facts as HistoryEntry['facts'] }
}

describe('numbering the facts one step produced', () => {
  it('numbers them consecutively from the id it is given', () => {
    expect(numberFacts(7, [fact('a'), fact('b'), fact('c')]).map((numbered) => numbered.id)).toEqual([7, 8, 9])
  })

  it('keeps everything else the fact carried', () => {
    expect(numberFacts(1, [fact('Raking Claw')])[0]).toMatchObject({ id: 1, title: 'Raking Claw' })
  })

  it('produces nothing for a step that resolved nothing', () => {
    expect(numberFacts(4, [])).toEqual([])
  })
})

describe('finding the next fact id', () => {
  it('starts at 1 on a timeline that has resolved nothing', () => {
    expect(nextFactId([entry([])], 0)).toBe(1)
  })

  it('continues from the last fact of the viewed position', () => {
    expect(nextFactId([entry([]), entry([{ id: 1 }, { id: 2 }])], 1)).toBe(3)
  })

  // A refused action and a phase advance can both land as entries that
  // produced no facts. The walk has to step back over them rather than
  // restart, or the next real action would reuse an id already spent.
  it('walks back over entries that produced no facts', () => {
    expect(nextFactId([entry([]), entry([{ id: 1 }]), entry([]), entry([])], 3)).toBe(2)
  })

  // Time travel moves the viewed position back, and submitting from there
  // truncates the future. Numbering counts from where the player is standing,
  // not from the branch that is about to be discarded — otherwise the new
  // entry would be numbered above facts the export will never contain.
  it('counts from the viewed position, not the end of the timeline', () => {
    const entries = [entry([]), entry([{ id: 1 }]), entry([{ id: 2 }, { id: 3 }])]
    expect(nextFactId(entries, 1)).toBe(2)
  })
})

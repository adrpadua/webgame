import { describe, expect, it } from 'vitest'
import type { EncounterState } from '@/engine'
import { selectCanUndo, selectUndoTarget, type HistoryEntry } from './workbench'

// Undo reads two fields of the timeline and nothing else, so the fixtures
// below are the timeline's shape rather than a running Encounter: what
// matters is which entries are the player's, which one an advance produced,
// and which of them actually did something.
const STATE = {} as EncounterState

function start(): HistoryEntry {
  return { label: 'Encounter start', step: null, state: STATE, facts: [] }
}

function advance(): HistoryEntry {
  return { label: 'Advance', step: { advance: true }, state: STATE, facts: [] }
}

function action(succeeded = true): HistoryEntry {
  return {
    label: 'Fire Slot',
    step: { action: { kind: 'fire_slot', sourceId: 'elian', slotIndex: 0 } },
    state: STATE,
    facts: [{ id: 1, succeeded } as HistoryEntry['facts'][number]],
  }
}

function timeline(entries: HistoryEntry[]) {
  return { entries, index: entries.length - 1 }
}

describe('selectUndoTarget', () => {
  it('takes back the player’s last action', () => {
    const store = timeline([start(), advance(), action()])
    expect(selectUndoTarget(store)).toBe(1)
    expect(selectCanUndo(store)).toBe(true)
  })

  it('walks back one action per press', () => {
    const entries = [start(), advance(), action(), action()]
    expect(selectUndoTarget({ entries, index: 3 })).toBe(2)
    expect(selectUndoTarget({ entries, index: 2 })).toBe(1)
  })

  // The window is the floor. A Boss Row's beats and the advance that closed
  // a window are not the player's to rewind.
  it('stops at the advance that opened the window', () => {
    const store = timeline([start(), advance(), action(), advance()])
    expect(selectUndoTarget(store)).toBeNull()
    expect(selectCanUndo(store)).toBe(false)
  })

  it('has nothing to take back at the start of an Encounter', () => {
    expect(selectUndoTarget(timeline([start()]))).toBeNull()
  })

  // A refused action left the state exactly as it found it, so undoing onto
  // it would read as a press that did nothing.
  it('steps over a refused action to reach the one that landed', () => {
    const store = timeline([start(), advance(), action(), action(false)])
    expect(selectUndoTarget(store)).toBe(1)
  })

  it('greys out when only refused actions stand in the window', () => {
    const store = timeline([start(), advance(), action(false), action(false)])
    expect(selectUndoTarget(store)).toBeNull()
  })

  // Time travel can park the index mid-timeline; undo reads from there, not
  // from the end.
  it('reads from the viewed position rather than the end of the line', () => {
    const entries = [start(), advance(), action(), advance(), action()]
    expect(selectUndoTarget({ entries, index: 3 })).toBeNull()
    expect(selectUndoTarget({ entries, index: 4 })).toBe(3)
  })
})

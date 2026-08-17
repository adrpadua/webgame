import { describe, expect, it } from 'vitest'
import { BACKDROPS, backdropFor } from './backdrop'

describe('arena backdrop', () => {
  it('gives each boss phase its own arena', () => {
    expect(backdropFor(1).key).toBe('arena-phase-1')
    expect(backdropFor(2).key).toBe('arena-phase-2')
    expect(backdropFor(1)).not.toBe(backdropFor(2))
  })

  // Stepping back across the Phase Trigger has to restore the first arena.
  // The scene re-reads this on every snapshot rather than swapping once at the
  // Phase Reveal, which is what makes time travel work in both directions.
  it('answers by phase alone, not by how the phase was reached', () => {
    expect(backdropFor(2)).toBe(backdropFor(2))
    expect(backdropFor(1)).toBe(BACKDROPS[0])
  })

  // A phase past the art keeps the most escalated arena drawn. Wrong by one
  // step beats an undefined texture and a board with no ground under it.
  it('holds the last arena for a phase nobody drew', () => {
    expect(backdropFor(3).key).toBe('arena-phase-2')
    expect(backdropFor(99).key).toBe('arena-phase-2')
  })

  it('survives a phase that is out of range or not a number', () => {
    expect(backdropFor(0).key).toBe('arena-phase-1')
    expect(backdropFor(-4).key).toBe('arena-phase-1')
    expect(backdropFor(Number.NaN).key).toBe('arena-phase-1')
  })

  it('gives every arena a key and a url', () => {
    for (const backdrop of BACKDROPS) {
      expect(backdrop.key).toBeTruthy()
      expect(backdrop.url).toBeTruthy()
    }
  })
})

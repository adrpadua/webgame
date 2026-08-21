import { describe, expect, it } from 'vitest'
import { hazardMark, NEUTRAL_MARK, statusFigure, statusLabel, statusMark } from './statusIcons'

// Every authored Counter and Hazard has to reach the HUD as something the
// player can tell apart from the mark beside it. The registry is
// presentation, so an unmarked one is not a load error — but it is a silent
// one, and this is where it stops being silent: a new file in
// `data/counters/` or `data/hazards/` fails here until it has a mark, rather
// than shipping as an anonymous steel rhombus nobody notices is anonymous.

// Read through Vite's glob rather than `node:fs`, the same way the content
// loader and the other content-facing tests reach `data/`.
const ids = (modules: Record<string, unknown>): string[] => Object.values(modules).map((entry) => (entry as { id: string }).id)

const AUTHORED_COUNTERS = ids(import.meta.glob('../../../../data/counters/*.json', { eager: true, import: 'default' }))
const AUTHORED_HAZARDS = ids(import.meta.glob('../../../../data/hazards/*.json', { eager: true, import: 'default' }))

function authoredCounterIds(): string[] {
  return AUTHORED_COUNTERS
}

describe('statusMark', () => {
  it('marks every authored Counter', () => {
    const unmarked = authoredCounterIds().filter((id) => statusMark(id) === NEUTRAL_MARK)
    expect(unmarked).toEqual([])
  })

  it('draws no two authored Counters the same way', () => {
    const marks = authoredCounterIds().map((id) => `${statusMark(id).glyph}:${statusMark(id).material}`)
    expect(new Set(marks).size).toBe(marks.length)
  })

  it('falls back to the neutral mark for a Counter it has never heard of', () => {
    expect(statusMark('a_counter_authored_after_this_file')).toEqual(NEUTRAL_MARK)
  })
})

describe('hazardMark', () => {
  it('marks every authored Hazard', () => {
    const unmarked = AUTHORED_HAZARDS.filter((id) => hazardMark(id) === NEUTRAL_MARK)
    expect(unmarked).toEqual([])
  })

  it('draws no two authored Hazards the same way', () => {
    const marks = AUTHORED_HAZARDS.map((id) => `${hazardMark(id).glyph}:${hazardMark(id).material}`)
    expect(new Set(marks).size).toBe(marks.length)
  })

  // The two namespaces are separate on purpose: a Hazard must not inherit a
  // Counter's mark by sharing its id, and it must not lose its own by not
  // sharing one.
  it('keeps ground marks out of the Counter table and back', () => {
    expect(statusMark('scorched')).toEqual(NEUTRAL_MARK)
    expect(hazardMark('seared')).toEqual(NEUTRAL_MARK)
  })

  it('falls back to the neutral mark for a Hazard it has never heard of', () => {
    expect(hazardMark('a_hazard_authored_after_this_file')).toEqual(NEUTRAL_MARK)
  })
})

describe('statusLabel', () => {
  it('names the Counter alone when one permanent Counter is held', () => {
    expect(statusLabel('Seared', 1, 0)).toBe('Seared')
  })

  it('carries the count the square shows', () => {
    expect(statusLabel('Seared', 2, 0)).toBe('Seared, 2 held')
  })

  it('carries the clock the square draws, singular and plural', () => {
    expect(statusLabel('Fortified', 1, 1)).toBe('Fortified, 1 round left')
    expect(statusLabel('Fortified', 4, 2)).toBe('Fortified, 4 held, 2 rounds left')
  })
})

describe('statusFigure', () => {
  it('says nothing for one held with no clock — the square says nothing either', () => {
    expect(statusFigure(1, 0)).toBe('')
  })

  it('prints each number the square prints, and both together', () => {
    expect(statusFigure(3, 0)).toBe('×3')
    expect(statusFigure(1, 2)).toBe('2r')
    expect(statusFigure(4, 1)).toBe('×4 · 1r')
  })
})

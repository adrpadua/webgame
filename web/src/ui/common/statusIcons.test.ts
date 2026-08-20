import { describe, expect, it } from 'vitest'
import { NEUTRAL_MARK, statusFigure, statusLabel, statusMark } from './statusIcons'

// Every authored Counter has to reach the HUD as something the player can
// tell apart from the Counter beside it. The registry is presentation, so an
// unmarked Counter is not a load error — but it is a silent one, and this is
// where it stops being silent: a new file in `data/counters/` fails here
// until it has a mark, rather than shipping as an anonymous steel rhombus
// nobody notices is anonymous.

// Read through Vite's glob rather than `node:fs`, the same way the content
// loader and the other content-facing tests reach `data/`.
const AUTHORED = Object.values(
  import.meta.glob('../../../../data/counters/*.json', { eager: true, import: 'default' }) as Record<string, { id: string }>,
)

function authoredCounterIds(): string[] {
  return AUTHORED.map((counter) => counter.id)
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

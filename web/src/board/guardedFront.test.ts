import { describe, expect, it } from 'vitest'
import { DEFAULT_ENCOUNTER_ID, loadCatalog } from '@/content'
import { axialDeltaFor, createEncounterState, guardedFrontHex, VALID_FACINGS, type EncounterState } from '@/engine'
import { axialToPixel, type Point } from './layout'
import {
  guardedFrontOutline,
  GUARDED_FRONT_FAR_ALPHA,
  GUARDED_FRONT_FILL_ALPHA,
  GUARDED_FRONT_NEAR_ALPHA,
  GUARDED_FRONT_RADIUS,
  marksGuardedFront,
  type GuardedFrontOutline,
} from './guardedFront'

const catalog = loadCatalog()

function opening(): EncounterState {
  return createEncounterState(catalog, DEFAULT_ENCOUNTER_ID)
}

// The outline as it is actually drawn: the guarded hex's own centre, aimed at
// the Boss it stands in front of.
function outlineFor(state: EncounterState, facing: number): { outline: GuardedFrontOutline; center: Point; bossCenter: Point } {
  const boss = state.board.entities[state.bossId]
  const front = guardedFrontHex(state.board, state.bossId, facing)
  if (front === null) {
    throw new Error('The opening board has a Boss.')
  }
  const center = axialToPixel(front)
  const bossCenter = axialToPixel(boss.coords)
  return { outline: guardedFrontOutline(center, bossCenter), center, bossCenter }
}

function midpoint(from: Point, to: Point): Point {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
}

function reach(point: Point, target: Point): number {
  return Math.hypot(point.x - target.x, point.y - target.y)
}

describe('the Guarded Front mark', () => {
  it('marks the post for a Tank and nobody else', () => {
    // Elian Voss's deck is Tank all the way down, which is the only thing that
    // says so: there is no Role field to disagree with.
    expect(marksGuardedFront(catalog, opening())).toBe(true)
    const healer = {
      ...catalog,
      cards: Object.fromEntries(
        Object.entries(catalog.cards).map(([id, card]) => [id, { ...card, tags: card.tags.map((tag) => (tag === 'tank' ? 'support' : tag)) }]),
      ),
    }
    expect(marksGuardedFront(healer, opening())).toBe(false)
  })

  it('says nothing on a board that is no longer being played', () => {
    // Victory, defeat, and the Encounter Clock all land here. A post to hold
    // is an instruction, and there is nothing left to hold.
    expect(marksGuardedFront(catalog, { ...opening(), active: false })).toBe(false)
  })

  it('cuts the hex in half at the Boss and closes back on itself', () => {
    for (const facing of VALID_FACINGS) {
      const { outline, center, bossCenter } = outlineFor(opening(), facing)
      expect(outline.near).toHaveLength(4)
      expect(outline.far).toHaveLength(4)
      // Every point of both halves lies on the tile's own outline...
      for (const point of [...outline.near, ...outline.far]) {
        expect(reach(point, center)).toBeCloseTo(GUARDED_FRONT_RADIUS, 6)
      }
      // ...the two halves meet end to end, so the six edges close the hex...
      expect(outline.far[0]).toEqual(outline.near[3])
      expect(outline.far[3]).toEqual(outline.near[0])
      // ...and the strong half is the one facing the Boss: its middle edge is
      // the edge the two pieces share. A Hero on the post stands behind it.
      expect(reach(midpoint(outline.near[1], outline.near[2]), bossCenter)).toBeLessThan(reach(midpoint(outline.far[1], outline.far[2]), bossCenter))
    }
  })

  it('turns with the Boss rather than staying where it was drawn', () => {
    const state = opening()
    const boss = state.board.entities[state.bossId]
    const fronts = VALID_FACINGS.map((facing) => guardedFrontHex(state.board, state.bossId, facing))
    // Six facings, six different posts, each one hex from the Boss.
    expect(new Set(fronts.map((front) => `${front?.q},${front?.r}`)).size).toBe(6)
    for (const facing of VALID_FACINGS) {
      const delta = axialDeltaFor(facing)
      expect(fronts[facing]).toEqual({ q: boss.coords.q + delta.q, r: boss.coords.r + delta.r })
    }
  })

  it('stays the quietest cool mark on the board', () => {
    // The board direction ranks the cool side by imminence — destinations
    // while choosing, the Hero, then the ground — and this is ground. The
    // legal-destination overlay is drawn at 0.35 over the whole tile, and the
    // tile is what the fill has to stay under; the outline is a line.
    expect(GUARDED_FRONT_FILL_ALPHA).toBeLessThan(0.35)
    // The half naming the side always outranks the half that only traces the
    // hex, or the mark says the post is behind the Hero.
    expect(GUARDED_FRONT_NEAR_ALPHA).toBeGreaterThan(GUARDED_FRONT_FAR_ALPHA)
  })
})

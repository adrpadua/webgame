import { describe, expect, it } from 'vitest'
import { hexKey, type Axial } from '@/engine'
import { axialToPixel, boundaryEdges, hexCorners, EDGE_NEIGHBORS, HEX_SIZE } from './layout'

describe('hex edges', () => {
  // The claim `EDGE_NEIGHBORS` makes is geometric, so it is checked
  // geometrically rather than by reading the table back. Two hexes that share
  // an edge share its midpoint, and that midpoint is halfway between their
  // centres — so if entry `i` really is the tile across edge `i`, these two
  // points coincide. A table transcribed one step out of phase passes every
  // "it has six entries" check and fails this one.
  it('names the tile across each edge, as the layout actually places it', () => {
    const origin = { q: 0, r: 0 }
    const center = axialToPixel(origin)
    const corners = hexCorners(center.x, center.y, HEX_SIZE)
    EDGE_NEIGHBORS.forEach((delta, index) => {
      const edgeMidpoint = {
        x: (corners[index].x + corners[(index + 1) % 6].x) / 2,
        y: (corners[index].y + corners[(index + 1) % 6].y) / 2,
      }
      const across = axialToPixel({ q: origin.q + delta.q, r: origin.r + delta.r })
      expect(edgeMidpoint.x).toBeCloseTo((center.x + across.x) / 2, 6)
      expect(edgeMidpoint.y).toBeCloseTo((center.y + across.y) / 2, 6)
    })
  })

  it('gives every edge of a lone hex to the boundary', () => {
    const lone = { q: 0, r: 0 }
    expect(boundaryEdges(new Set([hexKey(lone)]), lone)).toEqual([0, 1, 2, 3, 4, 5])
  })

  // The shape a Whelp's fuse actually paints: one hex and its six neighbours.
  // The centre is enclosed and contributes nothing, and each petal gives up
  // the three edges facing out — eighteen segments forming one closed outline
  // around the flower rather than seven separate hex outlines.
  it('outlines a radius-1 footprint once, around the outside', () => {
    const center: Axial = { q: 0, r: 0 }
    const petals = EDGE_NEIGHBORS.map((delta) => ({ q: center.q + delta.q, r: center.r + delta.r }))
    const footprint = new Set([center, ...petals].map(hexKey))

    expect(boundaryEdges(footprint, center)).toEqual([])
    for (const petal of petals) {
      expect(boundaryEdges(footprint, petal)).toHaveLength(3)
    }
    const total = [center, ...petals].reduce((sum, coords) => sum + boundaryEdges(footprint, coords).length, 0)
    expect(total).toBe(18)
  })

  // A footprint clipped by the board's rim is smaller, and its outline has to
  // be smaller with it. The blast telegraph is drawn from the hexes the rules
  // will actually burn, so an outline that closed around hexes that are not
  // there would be the board promising ground the Encounter cannot reach.
  it('follows a footprint clipped at the board edge', () => {
    const center: Axial = { q: 0, r: 0 }
    // Half the flower: the three petals on one side never made it on-board.
    const kept = EDGE_NEIGHBORS.slice(0, 3).map((delta) => ({ q: center.q + delta.q, r: center.r + delta.r }))
    const footprint = new Set([center, ...kept].map(hexKey))
    // The centre is no longer enclosed: the three missing petals are boundary.
    expect(boundaryEdges(footprint, center)).toEqual([3, 4, 5])
    for (const petal of kept) {
      expect(boundaryEdges(footprint, petal).length).toBeGreaterThanOrEqual(3)
    }
  })
})

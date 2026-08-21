import { describe, expect, it } from 'vitest'
import {
  NOTIFICATION_RULES,
  NOTIFICATION_ZONES,
  resolveZone,
  stackOrder,
  ZONE_CAPACITY,
  zoneMembers,
  type NotificationId,
} from './notifications'

const ALL_IDS = Object.keys(NOTIFICATION_RULES) as NotificationId[]

describe('notification zones', () => {
  it('gives every notification exactly one zone', () => {
    for (const id of ALL_IDS) {
      expect(NOTIFICATION_ZONES).toContain(NOTIFICATION_RULES[id].zone)
    }
    // The union type and the table are the same list: a member added to one
    // and not the other is the drift this guards.
    expect(ALL_IDS.length).toBe(NOTIFICATION_ZONES.flatMap((zone) => zoneMembers(zone)).length)
  })

  // Two members at the same rank would hand the order back to whichever
  // component App happens to mount first, which is the thing the table is for.
  it('ranks every member of a zone distinctly', () => {
    for (const zone of NOTIFICATION_ZONES) {
      const ranks = zoneMembers(zone).map(stackOrder)
      expect(new Set(ranks).size).toBe(ranks.length)
    }
  })

  it('orders a zone anchor-first', () => {
    expect(zoneMembers('herald')).toEqual(['beat-card'])
    expect(zoneMembers('guidance')).toEqual(['first-turn', 'coach-tip'])
    expect(zoneMembers('stage')).toEqual(['outcome', 'phase-banner'])
    expect(zoneMembers('dock')).toEqual(['targeting', 'move-payment', 'standing-demand', 'rejection', 'stat-panel', 'tile-panel'])
  })

  // The Beat Card is the tallest thing the surface floats and the whole of it
  // has to be readable, so it holds the board's top edge alone rather than the
  // dock, where the Hero Frame and the ally column already stand.
  it('heralds the Beat Card at the top edge, on its own', () => {
    expect(NOTIFICATION_RULES['beat-card'].zone).toBe('herald')
    expect(zoneMembers('herald')).toEqual(['beat-card'])
    expect(ZONE_CAPACITY.herald).toBe(1)
  })

  // The dock's anchor is the Action Bar's top edge, so its first rank is the
  // prompt that names a control on that bar.
  it('anchors the dock on a prompt about the controls', () => {
    expect(zoneMembers('dock')[0]).toBe('targeting')
    expect(stackOrder('targeting')).toBe(1)
  })

  it('docks the prompts that ask for a tap on the controls below them', () => {
    for (const id of ['targeting', 'move-payment', 'rejection'] as const) {
      expect(NOTIFICATION_RULES[id].zone).toBe('dock')
    }
  })

  // A toast that comes and goes on a timer must not shove the prompts: in a
  // bottom-anchored column only the members above the newcomer move, so the
  // transient one has to sit farther from the anchor than the stable ones.
  it('keeps the transient toast outside every dock prompt', () => {
    for (const id of ['targeting', 'move-payment', 'standing-demand'] as const) {
      expect(stackOrder('rejection')).toBeGreaterThan(stackOrder(id))
    }
  })
})

describe('resolveZone', () => {
  it('returns only the zone it was asked about', () => {
    expect(resolveZone('guidance', ['first-turn', 'targeting', 'phase-banner'])).toEqual(['first-turn'])
    expect(resolveZone('herald', ['first-turn', 'beat-card', 'targeting'])).toEqual(['beat-card'])
  })

  it('orders live members by rank rather than by call order', () => {
    expect(resolveZone('dock', ['stat-panel', 'targeting', 'rejection'])).toEqual(['targeting', 'rejection', 'stat-panel'])
  })

  it('lets the top rank take an exclusive zone', () => {
    expect(resolveZone('stage', ['phase-banner', 'outcome'])).toEqual(['outcome'])
    expect(resolveZone('guidance', ['coach-tip', 'first-turn'])).toEqual(['first-turn'])
  })

  // Over capacity the far ranks yield, never the thing the player is about
  // to touch.
  it('drops the outermost ranks when a zone overflows', () => {
    const crowded: NotificationId[] = ['targeting', 'move-payment', 'standing-demand', 'rejection', 'stat-panel', 'tile-panel']
    const shown = resolveZone('dock', crowded)
    expect(shown.length).toBe(ZONE_CAPACITY.dock)
    expect(shown).toEqual(['targeting', 'move-payment', 'standing-demand', 'rejection'])
    expect(shown).not.toContain('stat-panel')
  })

  it('shows nothing when nothing is live', () => {
    for (const zone of NOTIFICATION_ZONES) {
      expect(resolveZone(zone, [])).toEqual([])
    }
  })

  it('ignores a member listed twice', () => {
    expect(resolveZone('dock', ['rejection', 'rejection'])).toEqual(['rejection'])
  })
})

// The Boss Row is the busiest the overlay gets, and the one moment the Stat
// Panel is a live readout of what the Beat on screen is doing — so the caps
// have to clear that crowd rather than take the gauge away while it is being
// watched. The Beat Card no longer competes for the dock's four seats: it is
// heralded at the top edge, which is one more member the crowd can seat.
describe('the Boss Row crowd', () => {
  it('seats the Beat Card, the standing demand, a refusal, and the Stat Panel at once', () => {
    const live: NotificationId[] = ['stat-panel', 'rejection', 'standing-demand', 'beat-card']
    expect(resolveZone('herald', live)).toEqual(['beat-card'])
    expect(resolveZone('dock', live)).toEqual(['standing-demand', 'rejection', 'stat-panel'])
  })
})

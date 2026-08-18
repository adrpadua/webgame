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
    expect(zoneMembers('guidance')).toEqual(['first-turn', 'coach-tip'])
    expect(zoneMembers('stage')).toEqual(['outcome', 'phase-banner'])
    expect(zoneMembers('dock')).toEqual(['playout-continue', 'targeting', 'move-payment', 'rejection', 'stat-panel'])
  })

  // The dock's anchor is the Action Bar's top edge, so its first rank is the
  // prompt a player presses over and over through a Boss Row.
  it('anchors the dock on the pacing prompt', () => {
    expect(zoneMembers('dock')[0]).toBe('playout-continue')
    expect(stackOrder('playout-continue')).toBe(1)
  })

  it('docks the prompts that ask for a tap on the controls below them', () => {
    for (const id of ['playout-continue', 'targeting', 'move-payment', 'rejection'] as const) {
      expect(NOTIFICATION_RULES[id].zone).toBe('dock')
    }
  })

  // A toast that comes and goes on a timer must not shove the prompts: in a
  // bottom-anchored column only the members above the newcomer move, so the
  // transient one has to sit farther from the anchor than the stable ones.
  it('keeps the transient toast outside every dock prompt', () => {
    for (const id of ['playout-continue', 'targeting', 'move-payment'] as const) {
      expect(stackOrder('rejection')).toBeGreaterThan(stackOrder(id))
    }
  })
})

describe('resolveZone', () => {
  it('returns only the zone it was asked about', () => {
    expect(resolveZone('guidance', ['first-turn', 'targeting', 'phase-banner'])).toEqual(['first-turn'])
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
    const crowded: NotificationId[] = ['playout-continue', 'targeting', 'move-payment', 'rejection', 'stat-panel']
    const shown = resolveZone('dock', crowded)
    expect(shown.length).toBe(ZONE_CAPACITY.dock)
    expect(shown).toEqual(['playout-continue', 'targeting', 'move-payment'])
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

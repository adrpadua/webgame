// Where a floating message is allowed to land, and what happens when two of
// them want the same pixel.
//
// Every transient surface on the play field used to place itself. The coach
// tip pinned to the board's top edge, the targeting prompt at a hard `top-40`
// that landed on the advance control back when it sat in the phase strip, the
// phase word at `top-[34%]` that landed on whatever the guidance stack had
// grown to that round. An absolute offset cannot see another absolute offset,
// so whether two prompts collided came down to which pair happened to be up
// at once — which is not a layout, it is a coincidence that mostly holds.
//
// The lane is the fix, in two parts.
//
// **Zones** divide the board's overlay into three bands that cannot overlap,
// because they are flex children of one column rather than three independent
// offsets. Nothing is placed at a percentage any more; a zone is wherever the
// two zones beside it are not.
//
// **Stack rules** decide what happens inside a zone. Membership and order come
// from the table below rather than from the order `App` happens to mount them
// in, so moving a component in the tree cannot silently reorder the screen.
//
// A zone's `rank` counts outward from the edge the zone is anchored to: rank
// `1` is the member nearest that edge. For the dock that edge is the top of
// the Action Bar, so rank `1` is the thing hugging the controls. Two rules
// follow from that, and both are why the ranks below are the order they are:
//
//   - What the player is about to touch sits nearest the Action Bar, because
//     the prompt and the control it names should be read in one glance.
//   - What comes and goes on a timer sits farthest from it, because a
//     bottom-anchored column only shifts the members *above* the one that
//     appeared. A toast at rank `1` would shove the whole dock upward for
//     three and a half seconds; at the far end it displaces nothing.

export const NOTIFICATION_ZONES = ['guidance', 'stage', 'dock'] as const
export type NotificationZone = (typeof NOTIFICATION_ZONES)[number]

export type NotificationId =
  | 'first-turn'
  | 'coach-tip'
  | 'phase-banner'
  | 'outcome'
  | 'playout-continue'
  | 'targeting'
  | 'move-payment'
  | 'rejection'
  | 'stat-panel'

export interface NotificationRule {
  zone: NotificationZone
  // 1 is nearest the zone's anchor edge. Unique within a zone: a tie would
  // hand the order back to the render tree, which is what this table exists
  // to take away from it.
  rank: number
}

// One dock member — the stat panel — is not a notification. It is listed
// anyway because it floats in the same lane, and a lane with two owners is
// how the overlap came back last time: the panel has to yield to a prompt
// rather than sit under one.
export const NOTIFICATION_RULES: Record<NotificationId, NotificationRule> = {
  // Guidance, anchored to the board's top edge: teaching the player may
  // ignore. The scripted turn outranks ambient coaching, and while it runs the
  // coach mark does not render at all — one voice teaches at a time.
  'first-turn': { zone: 'guidance', rank: 1 },
  'coach-tip': { zone: 'guidance', rank: 2 },

  // Stage, the middle of the board: an announcement that owns the moment,
  // carries no control, and leaves on its own timer. One at a time — a second
  // banner over the first is two announcements and no announcement.
  outcome: { zone: 'stage', rank: 1 },
  'phase-banner': { zone: 'stage', rank: 2 },

  // Dock, anchored to the board's bottom edge — which is the Action Bar's top
  // edge. Everything that asks for a tap on the controls below it.
  'playout-continue': { zone: 'dock', rank: 1 },
  targeting: { zone: 'dock', rank: 2 },
  'move-payment': { zone: 'dock', rank: 3 },
  rejection: { zone: 'dock', rank: 4 },
  'stat-panel': { zone: 'dock', rank: 5 },
}

// How many members of a zone may speak at once. Past the cap the far-from-the
// anchor ranks yield, so the thing the player is about to touch is the last to
// go. The dock's cap is a guard rather than a routine event: the realistic
// crowd is one prompt, a toast, and the panel.
export const ZONE_CAPACITY: Record<NotificationZone, number> = {
  guidance: 1,
  stage: 1,
  dock: 3,
}

// The CSS `order` a member carries inside its zone. The guidance zone runs top
// down and the dock runs bottom up (`flex-col-reverse`), so one number reads
// as "distance from my anchor" in both.
export function stackOrder(id: NotificationId): number {
  return NOTIFICATION_RULES[id].rank
}

export function zoneMembers(zone: NotificationZone): NotificationId[] {
  return (Object.keys(NOTIFICATION_RULES) as NotificationId[])
    .filter((id) => NOTIFICATION_RULES[id].zone === zone)
    .sort((left, right) => NOTIFICATION_RULES[left].rank - NOTIFICATION_RULES[right].rank)
}

// Which of the live notifications a zone actually shows, anchor-first. Members
// of other zones are ignored rather than rejected: the caller passes the whole
// live set and asks each zone what it wants from it.
export function resolveZone(zone: NotificationZone, live: Iterable<NotificationId>): NotificationId[] {
  const wanted = new Set(live)
  return zoneMembers(zone)
    .filter((id) => wanted.has(id))
    .slice(0, ZONE_CAPACITY[zone])
}

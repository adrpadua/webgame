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
// **Zones** divide the board's overlay into four bands that cannot overlap,
// because they are flex children of one column rather than four independent
// offsets. Nothing is placed at a percentage any more; a zone is wherever the
// zones beside it are not.
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
//
// The Beat Card is the one surface those two rules could not place, and the
// `herald` zone is where it went (D-097). It is a control, so the first rule
// wanted it docked — but the bottom of the play surface is the crowded end:
// the Hero Frame is the dock's floor and the ally column stands in the same
// lane, so a card carrying four rows of a Beat's rules text reached the player
// with its last rows behind an ally frame, and the one thing a printed Beat
// owes is that all of it can be read. It is also the one control the surface
// already duplicates — the Action Bar's forward rail turns to Continue for
// exactly this press — so moving the card to the board's top edge moves the
// *reading* away from the thumb while leaving the *press* where it already is.
//
// It is its own zone rather than a second guidance member because the two
// carry opposite contracts: guidance is teaching the player may ignore, and a
// Beat Card is the Boss acting, which they may not.

export const NOTIFICATION_ZONES = ['herald', 'guidance', 'stage', 'dock'] as const
export type NotificationZone = (typeof NOTIFICATION_ZONES)[number]

export type NotificationId =
  | 'first-turn'
  | 'coach-tip'
  | 'phase-banner'
  | 'outcome'
  | 'beat-card'
  | 'targeting'
  | 'move-payment'
  | 'standing-demand'
  | 'rejection'
  | 'stat-panel'
  | 'tile-panel'

export interface NotificationRule {
  zone: NotificationZone
  // 1 is nearest the zone's anchor edge. Unique within a zone: a tie would
  // hand the order back to the render tree, which is what this table exists
  // to take away from it.
  rank: number
}

// Three dock members are not notifications. The two panels and the standing
// demand are listed anyway because they float in the same lane, and a lane
// with two owners is how the overlap came back last time: all of them have to
// yield to a prompt rather than sit under one.
export const NOTIFICATION_RULES: Record<NotificationId, NotificationRule> = {
  // Herald, the board's top edge: the Boss's own card, dealt where the whole
  // of it can be read. One member, and the top of the column, so a Beat lands
  // in the same place every press — a card that shifted because a tip appeared
  // or was dismissed would move under the finger pressing it.
  'beat-card': { zone: 'herald', rank: 1 },

  // Guidance, under the herald: teaching the player may ignore. The scripted
  // turn outranks ambient coaching, and while it runs the coach mark does not
  // render at all — one voice teaches at a time.
  'first-turn': { zone: 'guidance', rank: 1 },
  'coach-tip': { zone: 'guidance', rank: 2 },

  // Stage, the middle of the board: an announcement that owns the moment,
  // carries no control, and leaves on its own timer. One at a time — a second
  // banner over the first is two announcements and no announcement.
  outcome: { zone: 'stage', rank: 1 },
  'phase-banner': { zone: 'stage', rank: 2 },

  // Dock, anchored to the board's bottom edge — which is the Action Bar's top
  // edge. Everything that asks for a tap on the controls below it, and short
  // enough to be read in the strip the Hero Frame and the ally column leave.
  targeting: { zone: 'dock', rank: 1 },
  'move-payment': { zone: 'dock', rank: 2 },
  // The demand a Round is still carrying. It is not pressed and it is not
  // transient — it arrives when its row resolves and stays until the Round
  // ends — so it sits above the prompts and below the readouts: fight
  // information the player acts on, rather than a control or a reference.
  'standing-demand': { zone: 'dock', rank: 3 },
  rejection: { zone: 'dock', rank: 4 },
  'stat-panel': { zone: 'dock', rank: 5 },
  // Ground reads outside the piece standing on it. One tap can open both —
  // an Enemy on burning floor is two subjects — and of everything in the lane
  // the ground is the least urgent, so it is the first to yield when the dock
  // fills and it never pushes the piece's gauge away from the controls.
  'tile-panel': { zone: 'dock', rank: 6 },
}

// How many members of a zone may speak at once. Past the cap the far-from-the
// anchor ranks yield, so the thing the player is about to touch is the last to
// go. The dock's cap is a guard rather than a routine event: the realistic
// crowd is one prompt, a standing demand, a toast, and the panel. Four,
// because a Boss row is exactly when the Stat Panel is a live readout of what
// the Beat on screen is doing — a cap that hid it there would take the gauge
// away at the only moment it is being watched.
export const ZONE_CAPACITY: Record<NotificationZone, number> = {
  herald: 1,
  guidance: 1,
  stage: 1,
  dock: 4,
}

// The CSS `order` a member carries inside its zone. The herald and guidance
// zones run top down and the dock runs bottom up (`flex-col-reverse`), so one
// number reads as "distance from my anchor" in all of them.
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

# Oathcraft Notification Zones

Status: layout contract for every floating surface on the play field. This document decides *where* a transient message may land and *what happens when two want the same pixel*. What a message is made of is decided by [oathcraft-interface-direction.md](oathcraft-interface-direction.md); if the two disagree, that file wins and this one is the bug.

The implementation is `web/src/ui/overlays/notifications.ts` (the table and the stack rules) and `web/src/ui/overlays/NotificationLayer.tsx` (the geometry). Neither is allowed to disagree with this file, and a new floating surface belongs in the table before it belongs on screen.

## The Problem This Replaces

Every transient surface used to place itself. The coach tip pinned to the board's top edge, the targeting prompt at a hard `top-40`, the phase word at `top-[34%]`, the rejection toast at `bottom-40`. An absolute offset cannot see another absolute offset, so whether two prompts collided came down to which pair happened to be live at once.

They collided. `Boss Instant` printed across the playout's `Continue` bar; `Pick a piece` printed across the phase strip's `Next` button — the one control a player must not lose while a Top Card waits for its target. Neither was a bug in either component. Both were the absence of a layout.

The zones ended collisions *between notifications*. They did not end collisions between a notification and persistent chrome that claims the same lane without claiming a rank — see the ally column under [Stack Rules](#stack-rules), which is what moved the Beat Card to the `herald`.

## Zones

Four zones divide the board's overlay. They are flex children of one column, so **two zones cannot overlap** — that is a property of the layout engine, not a property of the numbers, and it does not need re-checking every time a bar grows a row. The whole column floats: a zone filling or emptying never resizes the board mid-Encounter, which is the overlay contract the interface direction asks for.

| Zone | Anchored to | Carries | Interactive |
| --- | --- | --- | --- |
| `herald` | The board's top edge, above everything | The Boss's own card: the Beat Card, dealt where all of it can be read | Yes, and required — but the press is mirrored on the Action Bar |
| `guidance` | Under the herald | Teaching the player may ignore: the scripted first turn, coach tips | Dismissible, never required |
| `stage` | The middle, in whatever the others leave | One announcement that owns the moment and leaves on a timer | Never — the hexes under it stay live |
| `dock` | The board's bottom edge, which is the Action Bar's top edge | Everything that asks for a tap on the controls just below it | Usually |

**The dock is the one to defend.** A prompt that names a control belongs beside that control: `Pick a piece` points at the board and the Cancel beside it, `Tap a card to step` points at the Hand. Putting them at the top of the board asked the player to read at one end of the screen and act at the other, and put them in the path of anything else that floated up there.

**The herald is the one exception, and it is bounded (D-097).** The Beat Card docked under that rule while it was one short title, and stopped fitting when it became a card: since the program strip was removed it is the only place a Beat is named and priced, so it carries stats, rules text and a line of answers — four rows or more — into the most crowded end of the surface, where the Hero Frame is the dock's floor and the ally column stands in the same lane. Beats arrived with their last rows behind an ally frame. A printed Beat that cannot be read whole is the one failure this card may not have, so the reading moved to the empty top edge. The press did not have to move with it: the Action Bar's forward rail already turns to `Continue` for exactly this moment, so the thumb keeps a control at the bottom of the screen.

The exception does not generalise. A surface earns the herald only by being **the Boss acting** and **too tall to read in the strip the frames leave**; a prompt that names a control still docks.

## Stack Rules

Membership and order come from the table in `notifications.ts`, never from the order `App` happens to mount things in. Moving a component in the tree must not be able to reorder the screen.

**Rank counts outward from the anchor.** Rank `1` is the member nearest the zone's edge. For the dock that edge is the Action Bar, so rank `1` is the thing hugging the controls; for the herald and guidance it is the board's top edge.

Two rules set the ranks:

1. **What the player is about to touch sits nearest the Action Bar**, so the prompt and the control it names are read in one glance — and so it is the last thing to yield when the lane is full.
2. **What comes and goes on a timer sits farthest from it.** A bottom-anchored column only shifts the members *above* the one that appeared. A toast at rank `1` would shove the whole dock upward for three and a half seconds; at the far end it displaces nothing.

**Capacity.** `herald`, `guidance` and `stage` seat one member each — the Boss says one thing at a time, two voices teaching at once is no voice, and a second banner over the first is no announcement. The `dock` seats four. Past the cap the outermost ranks yield and are hidden rather than unmounted: an unmounted member would free the capacity that suppressed it and mount again, which is a loop.

**An empty zone costs nothing.** The column gaps its children, so a silent zone would still push the ones below it down the board. The two top zones are hidden outright when empty. `stage` is not: it is the flex child that holds the column open, and hiding it would leave the dock to be aligned against nothing and jump off the Action Bar.

**The dock's floor is the Hero Frame (D-065).** The frame is persistent chrome, not a notification — it never comes or goes, so it has no rank to claim — and the dock's column stacks upward from the frame's top edge instead of the Action Bar's. The smoke suite holds every floating member off the frame the same way it holds them off the bands.

**One dock member is not a notification.** The stat panel is listed anyway, because it floats in the same lane, and a lane with two owners is how the overlap came back last time. It takes the outermost rank because it is the one member a player can reopen with a tap.

**The ally column is a third owner of that lane, and it is not in the table at all.** The party frames are persistent chrome anchored above the Hero Frame (party-frame direction 1A), so they claim the dock's left edge without claiming a rank, and the zone geometry cannot see them. That is how the Beat Card came to be covered. Until the frames are modelled here, a dock member has to be short enough to read in the strip beside them — and the smoke suite measures the Beat Card against the column directly rather than against the zone table, in the two-seat encounter where the column is up.

## What This Does Not Decide

- **Modals.** The guide, the replace confirmation, and the hold popover are not notifications — they take the whole surface, block it, and leave when answered. They sit above the layer and are outside this contract.
- **When a message appears.** Each component still decides its own silence and returns nothing for it. The zones decide only where it lands and who yields.
- **What a message says.** Copy, tone, and materials belong to the interface direction.

## Review Checklist

- Does every floating surface carry a row in `NOTIFICATION_RULES`, and does it render through `Notify`?
- Is a prompt that names a control in the `dock`, and is it within reach of that control?
- Is a new dock member short enough to be read beside the ally column, or does it belong in the `herald`?
- Does anything transient sit at a rank that would shove a stable member when it arrives?
- Do the smoke suite's zone assertions still run in a state where three or more members are live, **and in a party Encounter**? A layout guard that only ever measures one bar, in the one Encounter with no ally column, is measuring nothing.

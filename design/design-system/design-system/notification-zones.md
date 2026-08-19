<!-- Carried from docs/content/oathcraft-notification-zones.md by design/design-system/build_ds.py.
     That file is the source of truth; edit it there, not here. -->

# Oathcraft Notification Zones

Status: layout contract for every floating surface on the play field. This document decides *where* a transient message may land and *what happens when two want the same pixel*. What a message is made of is decided by [oathcraft-interface-direction.md](oathcraft-interface-direction.md); if the two disagree, that file wins and this one is the bug.

The implementation is `web/src/ui/notifications.ts` (the table and the stack rules) and `web/src/ui/NotificationLayer.tsx` (the geometry). Neither is allowed to disagree with this file, and a new floating surface belongs in the table before it belongs on screen.

## The Problem This Replaces

Every transient surface used to place itself. The coach tip pinned to the board's top edge, the targeting prompt at a hard `top-40`, the phase word at `top-[34%]`, the rejection toast at `bottom-40`. An absolute offset cannot see another absolute offset, so whether two prompts collided came down to which pair happened to be live at once.

They collided. `Boss Instant` printed across the playout's `Continue` bar; `Pick a piece` printed across the phase strip's `Next` button — the one control a player must not lose while a Top Card waits for its target. Neither was a bug in either component. Both were the absence of a layout.

## Zones

Three zones divide the board's overlay. They are flex children of one column, so **two zones cannot overlap** — that is a property of the layout engine, not a property of the numbers, and it does not need re-checking every time a bar grows a row. The whole column floats: a zone filling or emptying never resizes the board mid-Encounter, which is the overlay contract the interface direction asks for.

| Zone | Anchored to | Carries | Interactive |
| --- | --- | --- | --- |
| `guidance` | The board's top edge | Teaching the player may ignore: the scripted first turn, coach tips | Dismissible, never required |
| `stage` | The middle, in whatever the other two leave | One announcement that owns the moment and leaves on a timer | Never — the hexes under it stay live |
| `dock` | The board's bottom edge, which is the Action Bar's top edge | Everything that asks for a tap on the controls just below it | Usually |

**The dock is the one to defend.** A prompt that names a control belongs beside that control: `Pick a piece` points at the board and the Cancel beside it, `Tap a card to step` points at the Hand, `Continue` is itself the control. Putting them at the top of the board asked the player to read at one end of the screen and act at the other, and put them in the path of anything else that floated up there.

## Stack Rules

Membership and order come from the table in `notifications.ts`, never from the order `App` happens to mount things in. Moving a component in the tree must not be able to reorder the screen.

**Rank counts outward from the anchor.** Rank `1` is the member nearest the zone's edge. For the dock that edge is the Action Bar, so rank `1` is the thing hugging the controls.

Two rules set the ranks:

1. **What the player is about to touch sits nearest the Action Bar**, so the prompt and the control it names are read in one glance — and so it is the last thing to yield when the lane is full.
2. **What comes and goes on a timer sits farthest from it.** A bottom-anchored column only shifts the members *above* the one that appeared. A toast at rank `1` would shove the whole dock upward for three and a half seconds; at the far end it displaces nothing.

**Capacity.** `guidance` and `stage` seat one member each — two voices teaching at once is no voice, and a second banner over the first is no announcement. The `dock` seats four. Past the cap the outermost ranks yield and are hidden rather than unmounted: an unmounted member would free the capacity that suppressed it and mount again, which is a loop.

**The dock's floor is the Hero Frame (D-065).** The frame is persistent chrome, not a notification — it never comes or goes, so it has no rank to claim — and the dock's column stacks upward from the frame's top edge instead of the Action Bar's. The smoke suite holds every floating member off the frame the same way it holds them off the bands.

**One dock member is not a notification.** The stat panel is listed anyway, because it floats in the same lane, and a lane with two owners is how the overlap came back last time. It takes the outermost rank because it is the one member a player can reopen with a tap.

## What This Does Not Decide

- **Modals.** The guide, the replace confirmation, and the hold popover are not notifications — they take the whole surface, block it, and leave when answered. They sit above the layer and are outside this contract.
- **When a message appears.** Each component still decides its own silence and returns nothing for it. The zones decide only where it lands and who yields.
- **What a message says.** Copy, tone, and materials belong to the interface direction.

## Review Checklist

- Does every floating surface carry a row in `NOTIFICATION_RULES`, and does it render through `Notify`?
- Is a prompt that names a control in the `dock`, and is it within reach of that control?
- Does anything transient sit at a rank that would shove a stable member when it arrives?
- Do the smoke suite's zone assertions still run in a state where three or more members are live? A layout guard that only ever measures one bar is measuring nothing.

# Layout And Card Design Grill

Status: accepted prototype direction. This records the fast-forward design grill for the portrait combat HUD and player cards.

## Resulting Q&A

| # | Decision | Accepted answer | Why |
| --- | --- | --- | --- |
| 1 | Hand shape | Three equal, non-overlapping Compact Cards. | Stable touch targets and fast scanning beat decorative fanning. |
| 2 | Portrait hierarchy | Status and phase control at top; board in the center; Action Bar above the Hand; Hand at the bottom. | The board remains the tactical focus while player inputs stay thumb-reachable. |
| 3 | Compact-card content | Name, timing, cost, and charge capacity only. | A hand card is for choosing and dragging, not reading a rules paragraph. |
| 4 | Full-card disclosure | Hold a Compact Card to inspect full art and rules; release or tap outside to dismiss. | Preserves a fast hand without making card text inaccessible. |
| 5 | Card gestures | Drag hand card to empty slot to prepare; drag onto occupied slot to charge; tap loaded slot to activate. | Every common card action is performed on the card or slot itself. |
| 6 | Targeted activation | Untargeted loaded slots fire on tap. Targeted loaded slots should enter a targeting state, then accept a tap on a highlighted legal board target. | Removes the current dependence on preselecting a board target before activating the slot. |
| 7 | Board affordances | Legal targets, movement destinations, boss telegraphs, and terrain states render directly on hexes. | The board must explain spatial consequences without a side inspector. |
| 8 | Boss-program presentation | A compact top strip shows the current Instant and Incoming summary; tapping it expands the six ordered beats. | Boss intent stays visible without stealing the bottom interaction zone. |
| 9 | Visual fidelity | Continue with low-fidelity shared placeholder art and a stable neutral card shell until per-card content is ready. | The prototype should test information hierarchy and interaction before illustration production. |
| 10 | Persistent buttons | Keep only `Next` and post-encounter `Restart` in the player HUD; coordinate display stays debug-only. | Buttons advance a global state or recover from a terminal state; direct manipulation handles combat actions. |
| 11 | Card visual language | Timing is encoded with a short label and color; card identity relies on name; expanded inspection owns art and rules. | Color assists recognition but is not the only carrier of meaning. |
| 12 | Accessibility | Compact cards remain at least 44 px tall, and hold inspection is dismissible by release or outside tap. | Touch convenience cannot make the prototype inaccessible. |

## Consequences

- The current HUD implements decisions 1-5, 8-10, and 12.
- Targeted card flow currently still uses a selected board target before slot activation. Decision 6 is the next interaction change needed for full alignment.
- Per-card art, iconography, and exact card typography remain intentionally open; they should follow after the interaction loop is proven.

## Related Records

- [ADR 0006](D:/dev/webgame/docs/adr/0006-use-a-portrait-first-direct-manipulation-combat-hud.md)
- [Prototype Rules](D:/dev/webgame/docs/rules/prototype-rules.md)
- [Mechanical Pillars And Inspirations](D:/dev/webgame/docs/rules/mechanical-pillars-and-inspirations.md)

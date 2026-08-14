# Improve First-Turn Loadout Screen Comprehension for New Players

Status: ready-for-agent

## Player Problem

A newcomer can look at the current portrait loadout screen and see that there is a board, cards, health bars, and buttons, but may still not understand the next required action with confidence.

The current screen asks the player to infer too much at once:

- `Load cards` is jargon rather than a plain action.
- the next legal move is not visually obvious enough;
- red-outlined cards can read as danger, invalid state, or enemy pressure instead of selected/legal interaction;
- the `LOAD` slots do not clearly communicate "drag a card here";
- several on-screen markers and symbols compete for attention before the player knows what matters;
- the top controls and bottom status strip communicate system state, but not the immediate task in plain language.

That means the first impression is "there is a system here" rather than "I know what to do right now."

## Desired Outcome

Make the first loadout interaction understandable at a glance for a newcomer.

The player-facing promise is: on first view of the loadout screen, a new player can tell that they should put a card into a slot and then press Play, without needing outside explanation or trial-and-error to discover the basic flow.

## Scope

- Clarify the immediate first-turn instruction in plain language, centered on the next concrete action rather than internal jargon.
- Make the next legal interaction visually obvious when a card is selected or otherwise actionable.
- Improve first-glance affordances so a player can distinguish:
  - what is interactive;
  - what is selected;
  - what is a legal destination;
  - what is enemy danger or invalid state; and
  - what is secondary information.
- Make the loadout slots read more clearly as card destinations.
- Strengthen action hierarchy so `Play` is the primary progression action and `Help` is a clearly secondary support control in this slice.
- Reduce or defer unexplained visual noise that does not help a newcomer complete the current loadout step.
- Improve the readability of the current phase / round display so it supports orientation instead of encoding too much shorthand for a first glance.
- Preserve the existing rules model: the player still loads cards into slots, then advances the phase with `Play`.

## Explicit Non-Goals

- No broad combat HUD redesign.
- No gameplay-rule change, timing change, or input-authority change.
- No new contextual tutorial prompt system in this issue; that remains the separate approved onboarding slice in proposal 08.
- No merger with the mobile safe-bounds hardening work in proposal 10, although delivery may reuse verified layout findings.
- No requirement to explain every board mechanic or every symbol at once; this slice is about making the first required action understandable.
- No player-facing targeting or multiplayer UI expansion.

## Acceptance Evidence

Before this intake can close as delivered, evidence must show that:

1. A newcomer can identify the next required loadout action from the screen itself: put a card into a slot, then press `Play`.
2. The first-turn instruction uses player-facing plain language rather than relying on unexplained internal jargon.
3. Selected, legal, invalid, and enemy-danger visual states are distinguishable without overloading the same color treatment.
4. The loadout slots communicate that they are card destinations, not passive status panels.
5. The top action hierarchy clearly distinguishes the primary progression action from secondary controls.
6. The first-view status information is readable enough to orient the player without crowding out the immediate task.
7. A focused newcomer-observation pass or equivalent hands-on UX evidence shows that a first-time player can correctly begin the loadout flow without verbal coaching.
8. UI/UX and Test Automation verify the updated screen remains readable and interactive in the supported portrait viewport, including the canonical `390x844` logical canvas.

## Affected Areas

| Area | Product impact |
| --- | --- |
| UI/UX | Owns the first-view instruction wording, action hierarchy, visual affordances, selection/danger semantics, and slot readability. |
| Architecture | Preserves the boundary that legal-action highlighting and screen state reflect authoritative encounter/slot legality rather than UI-invented rules. |
| Test Automation | Owns focused regression checks for the first-view loadout presentation and any reusable UI-validation guards that support the slice. |
| Accessibility | Ensures the new hierarchy and state treatments remain readable, reachable, and not color-only. |
| Product Management | Keeps this issue focused on newcomer comprehension of the current loadout step rather than expanding into full onboarding, rules explanation, or broad HUD redesign. |

## Canonical Documents To Consult Or Update

- [Embermaw vertical slice](../../../docs/artifacts/embermaw-vertical-slice.md): portrait HUD reading order, direct-manipulation loadout flow, slot presentation, and control hierarchy.
- [Accessibility contract](../../../docs/artifacts/accessibility.md): target size, readable states, and non-color-only communication.
- [Probe harness](../../../docs/artifacts/probe-harness.md): mobile/layout/accessibility validation expectations.
- [Project coordination ledger](../../../docs/artifacts/project-coordination.md): active UI ownership boundaries and nearby mobile-safe-bounds work.
- [CONTEXT.md](../../../CONTEXT.md): Bottom Interaction Zone intent and shared UI vocabulary.

## Confirmed Product Decisions

- The first-turn screen should communicate the current required action in plain language.
- `Play` should read as the primary progression action, with `Help` as the clearly secondary support control in this slice.
- Any future `Undo` capability is out of scope for this issue and requires separate product approval with explicit gameplay, replay, and Encounter Record semantics.
- Red should not do double duty as both danger/error and the default selected-card affordance.
- This slice is distinct from contextual tutorial prompts and from mobile safe-bounds hardening, even if delivery reuses related findings.

## Remaining Delivery Decisions

Product intent is approved. Delivery may choose the smallest effective combination of copy, hierarchy, slot affordance, highlighting, and de-emphasis changes that satisfies the newcomer-comprehension outcome while preserving the confirmed non-goals.

## Risks And Dependencies

- A purely cosmetic pass could make the screen prettier without making the next action more understandable.
- If visual state colors keep overlapping meanings, the player may still misread selection as danger or failure.
- If the screen tries to explain too many systems at once, comprehension may worsen rather than improve.
- This issue sits near proposal 08 and proposal 10 in delivery space; the Orchestrator must preserve the boundaries so first-turn comprehension, tutorial prompting, and safe-bounds hardening do not get silently merged.

## Approval Record

On Friday, August 14, 2026, the user reviewed the current loadout screen from a newcomer/gamer perspective and explicitly requested that the resulting comprehension problem be logged as a backlog issue and made `ready-for-agent`. The approved outcome is that a first-time player can look at this screen and understand what to do next without outside explanation. The Orchestrator must preserve that outcome and return any broader HUD redesign or onboarding-system expansion to PM and the user.

Later on Friday, August 14, 2026, the user explicitly approved narrowing this slice to remove the unapproved mobile `Undo` requirement. Proposal 11 now preserves `Play` as the primary progression action and `Help` as the secondary support control in this slice. Any future `Undo` capability must return as a separate product/rules intake.

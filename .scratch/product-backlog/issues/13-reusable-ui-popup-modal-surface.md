# Add a Reusable UI Popup Modal Surface

Status: needs-triage

## Player Problem

Some player-facing information needs more focus and structure than an inline pane or transient prompt can provide. In the current portrait UI, a large guide/help surface can compete with the board, controls, and bottom interaction zone without clearly reading as a deliberate "pause and read this" moment.

The player problem is not just styling. A newcomer can struggle to tell whether a large text panel is:

- a passive part of the HUD;
- a temporary teaching surface;
- a required confirmation;
- dismissible help; or
- blocking progress.

That ambiguity weakens comprehension and makes future UI guidance, confirmations, and explanation surfaces harder to scale consistently.

## Desired Outcome

Add one reusable popup modal surface to the UI vocabulary for moments that genuinely need focused attention.

The player-facing promise is: when the game needs to show a concentrated explanation, help surface, or explicit decision, the player sees a clearly framed, readable, dismissible popup that feels intentional, stays within mobile safe bounds, and behaves consistently across uses.

This should complement the approved non-blocking tutorial-prompt system rather than replacing it.

## Scope

- Define a reusable popup modal surface for focused UI moments such as:
  - Help/Rules reading;
  - explicit confirmations;
  - future focused instructional or summary surfaces where a non-blocking prompt is not sufficient.
- Establish the player-facing contract for how a modal differs from:
  - the normal HUD;
  - non-blocking tutorial prompts;
  - card inspection; and
  - end-of-encounter or restart surfaces.
- Ensure the modal reads as an intentional overlay with clear hierarchy, readable text, obvious dismissal/confirmation actions, and safe portrait placement.
- Keep the modal reusable so future features do not invent one-off popup surfaces with conflicting behavior.

## Explicit Non-Goals

- Replacing the approved non-blocking tutorial-prompt system in proposal 08.
- Turning every explanation or prompt into a modal by default.
- Changing gameplay rules, timing, input authority, or encounter logic.
- Redesigning the whole combat HUD.
- Replacing the existing card-inspection behavior unless a later approved slice chooses to unify it.
- Smuggling new onboarding flow, deck tuning, or encounter pacing changes into a UI-surface proposal.

## Acceptance Evidence

Before this intake can close as delivered, evidence must show that:

1. The UI has one reusable modal vocabulary rather than one-off popup behavior per feature.
2. Players can distinguish a modal from a non-blocking tutorial prompt and from ordinary HUD content.
3. The modal remains fully within the supported portrait viewport and respects the established safe-bounds/accessibility contracts.
4. Title, body text, and primary/secondary dismissal or confirmation actions are readable and obvious on first view.
5. Background gameplay information remains visually subordinate while the modal is present, without creating hidden rules authority in the overlay.
6. At least one approved first-use surface demonstrates that the modal improves comprehension or clarity versus the current inline/pane behavior.

## Affected Areas

| Area | Product impact |
| --- | --- |
| UI/UX | Owns modal hierarchy, readability, action affordance, and distinction from prompts/help panes/inspection. |
| Architecture | Preserves the boundary that a modal is presentation, not rules authority. |
| Test Automation | Verifies portrait safe bounds, accessibility, dismissal/confirmation behavior, and no overlap/regression in supported viewports. |
| Accessibility | Ensures readable text, obvious actions, focus/dismiss affordance, and non-clipped presentation. |
| Product Management | Keeps modal use deliberate so it does not silently absorb tutorial prompting, first-turn comprehension, or unrelated HUD redesign scope. |

## Canonical Documents To Consult Or Update

- [Embermaw vertical slice](../../../docs/artifacts/embermaw-vertical-slice.md)
- [Accessibility contract](../../../docs/artifacts/accessibility.md)
- [Project coordination ledger](../../../docs/artifacts/project-coordination.md)
- [Contextual mobile tutorial prompts](08-contextual-mobile-tutorial-prompts-embermaw.md)
- [First-turn loadout comprehension](11-improve-first-turn-loadout-comprehension.md)

## Open Product Decisions

- What is the first approved use case for the modal surface?
  - Help/Rules replacement
  - confirmation dialogs
  - a focused onboarding/help explainer
  - another explicit surface
- Should the first slice be dismissible-only, or should it also include primary/secondary action variants?
- Should the modal be reserved for explicitly blocking moments, or may it also be used for optional focused reading where gameplay remains visually paused behind it?
- Which existing surface, if any, should be the first candidate to migrate onto the reusable modal contract?

## Risks And Dependencies

- If the modal boundary is too broad, delivery may turn non-blocking tutorial guidance into intrusive blocking UI.
- If the modal is too generic without a clear first approved use case, this can drift into component-building without a player-value proof.
- If it ignores safe-bounds and accessibility lessons from proposal 10, it could recreate off-screen or clipped-control problems in a new form.
- This proposal sits near proposal 08 and proposal 11; the Orchestrator must preserve the boundary between non-blocking prompts, first-turn comprehension, and deliberately blocking/focused modal surfaces.

## Approval Record

On Friday, August 14, 2026, the user requested a reusable popup modal in the UI and provided a screenshot of the current guide/help presentation. PM records this as a distinct product/UI-surface proposal because it overlaps existing tutorial-prompt and first-turn-comprehension work but is not identical to either. This item remains `needs-triage` until the user approves the first-use boundary and modal behavior.

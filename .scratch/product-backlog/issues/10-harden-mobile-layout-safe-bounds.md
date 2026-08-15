# Harden Mobile HUD Layout Safe Bounds So Controls Never Render Off-Screen

Status: resolved

## Player Problem

The current portrait HUD can let critical controls drift partially off-screen after layout or button edits. In the reported mobile screenshot, the Undo control on the left and two top-right controls are clipped by the viewport edge.

That creates a player-facing reliability problem, not just a visual polish issue:

- players can lose access to required controls;
- touch targets may become unreadable or unreachable;
- future UI changes become risky because a local edit can silently break a different viewport or control group.

The game already treats portrait mobile as the primary HUD mode, so "important controls stay fully visible" needs to be a durable contract rather than a best-effort layout outcome.

## Desired Outcome

Add a backlog proposal for mobile HUD layout-safe-bounds hardening so visible interactive controls never render partially off-screen in supported portrait layouts, including after future button and layout edits.

The player-facing promise is simple: every required button and control remains fully visible, reachable, and readable inside the viewport. Layout changes should fail validation before a clipped control can ship.

## Scope

- Fix the currently observed portrait regression where Undo and top-right controls can render beyond the viewport bounds.
- Define a durable layout-safe-bounds contract for mobile HUD controls and reserved control regions.
- Require future HUD and button edits to preserve fully on-screen interactive controls rather than relying on manual inspection.
- Harden the layout/rendering system around:
  - viewport-safe anchoring and margins;
  - reserved control lanes or containers for critical buttons;
  - clear ownership of which surfaces may compress, wrap, scroll, clamp, or reposition when space tightens;
  - validation that catches off-screen or clipped controls before delivery closes.
- Cover the portrait controls most likely to regress:
  - Undo and Play/Continue-style phase controls;
  - Help / Rules and other top-right utility controls;
  - any other always-visible interactive mobile HUD controls that share those regions.
- Preserve the current portrait-first reading order and Bottom Interaction Zone intent unless a separate approved product change says otherwise.

## Explicit Non-Goals

- No redesign of the overall combat HUD information architecture.
- No change to gameplay rules, action timing, or input authority.
- No approval for arbitrary new buttons or utility surfaces to be added to the mobile HUD.
- No requirement that every non-interactive decorative or oversized art element stay fully visible at all times; this proposal is about required interactive controls and their readable labels/icons.
- No silent merger with the currently tracked scene parser fix or any unrelated active UI regression ticket; those remain separate delivery scopes unless explicitly combined later.

## Acceptance Evidence

Before this intake can close as delivered, evidence must show that:

1. The currently reported off-screen Undo and top-right control regression is resolved in the supported portrait layout.
2. A documented layout-safe-bounds contract defines how required mobile controls stay fully inside the viewport, including minimum edge margins or equivalent in-bounds guarantees.
3. The portrait HUD preserves a stable reserved region or equivalent safe-layout mechanism for critical controls so later edits do not push them outside the viewport.
4. Automated layout validation proves that visible interactive mobile HUD controls remain fully on-screen across the supported portrait viewport matrix, including the canonical `390x844` logical canvas and the default non-headless mobile presentation path.
5. Validation fails when a required control becomes clipped, partially off-screen, or unreadably compressed.
6. Accessibility review confirms affected controls remain reachable and meet existing target-size expectations after the hardening change.
7. The final contract clearly states what may adapt under pressure (for example wrapping, scrolling, compacting, or reflow) so new UI work does not reintroduce edge clipping.

## Affected Areas

| Area | Product/process impact |
| --- | --- |
| UI/UX | Owns the mobile control-region contract, readable fallback behavior, and the immediate regression fix in the supported portrait layouts. |
| Architecture | Owns any reusable layout or rendering seam needed so viewport-safe placement is a durable system contract rather than one-off per-button tuning. |
| Test Automation | Owns the viewport-safe validation matrix and failure conditions for clipped or off-screen controls. |
| Accessibility | Confirms target size, reachability, and readable labels remain intact after hardening. |
| Engineering Enablement | Owns any reusable probe or validation guardrail that future UI edits must satisfy. |
| Product Management | Keeps this proposal focused on layout safety and regression prevention rather than broad HUD redesign. |

## Canonical Documents To Consult Or Update

- [Embermaw vertical slice](../../../docs/artifacts/embermaw-vertical-slice.md): portrait HUD reading order, reserved control row intent, and mobile layout expectations.
- [Accessibility contract](../../../docs/artifacts/accessibility.md): pointer targets, reachable controls, and readable state communication.
- [Probe harness](../../../docs/artifacts/probe-harness.md): mobile/layout/accessibility validation expectations.
- [Project coordination ledger](../../../docs/artifacts/project-coordination.md): existing active mobile-layout regression context and ownership boundaries.
- [CONTEXT.md](../../../CONTEXT.md): Bottom Interaction Zone intent and broader HUD vocabulary where relevant.

## Open Product Decisions

- Should the first approved deliverable harden only the currently visible always-on mobile controls, or should it also include a reusable viewport-safety contract for transient overlays and prompt-adjacent controls in the same pass?
- Should the validation bar be "fully on-screen" only, or "fully on-screen plus reserved minimum edge padding and no label/icon clipping" for every required mobile control?

PM recommendation: approve the stronger version. Require fully on-screen controls with readable content and explicit edge-padding / non-clipping guarantees, because that is the version most likely to prevent this class of regression from returning under future edits.

## Risks And Dependencies

- A narrow one-off fix could solve today's Undo overflow while leaving the underlying layout contract weak enough for the next edit to break another control.
- If the mobile HUD lacks a clearly defined pressure-release strategy, any new prompt, button, or status element can push neighboring controls off-screen again.
- Validation must use the real supported portrait matrix, not just a single happy-path viewport, or layout regressions will continue to escape.
- This work depends on keeping UI behavior, accessibility rules, and validation probes aligned; otherwise "looks fixed" and "stays fixed" will drift apart.

## Approval Record

On 2026-08-14, the user reported a portrait mobile regression where Undo and top-right controls rendered off-screen and requested a backlog issue that fixes the bug while hardening the layout/rendering system so future layout and button edits do not push required controls off-screen again. Later on 2026-08-14, the user explicitly approved moving this proposal to delivery intake. This item is now `ready-for-agent`.

The Orchestrator must preserve the confirmed safe-bounds hardening outcome, non-goals, acceptance evidence, and portrait layout boundary; create separate delivery tracking outside the PM backlog; and return any broader HUD redesign or interaction-model change to PM and the user.

# Harden Mobile Layout Safe Bounds

Status: active

## Approved outcome

Every required interactive mobile HUD control must remain fully visible, reachable, and readable in supported portrait layouts. Future layout/button edits must fail validation before clipping or off-screen placement ships.

## Delivery sequence

1. Preserve the current UI/UX mobile-layout regression handoff as a distinct work item; collect its verified findings without merging or closing it through this slice.
2. Resolve the two open scope/validation decisions below.
3. UI/UX owns the safe-bounds contract and bounded implementation; Architecture reviews any reusable shared layout seam; Test Automation independently validates the supported viewport matrix; accessibility verifies targets and readability.

## Confirmed delivery decisions

On 2026-08-14, the user approved the stronger safe-bounds path: cover always-visible and transient prompt-adjacent required controls; require fully in-bounds placement, explicit edge padding, and non-clipped readable labels/icons. This remains bounded to required interactive surfaces rather than a whole-HUD redesign.

## Non-goals

No overall HUD redesign, new arbitrary utilities, gameplay/action/input authority change, or requirement that decorative art stay in bounds. Preserve the portrait reading order and Bottom Interaction Zone.

## Return protocol

All assignments use the mandatory return packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet).

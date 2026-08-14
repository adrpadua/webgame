# Reusable Hex Target-Pattern Acceptance Catalog

Status: resolved

## Closure

Design vocabulary/reference mapping, Architecture's scene-free `BoardQuery` result seam, and Test Automation's independent semantic matrix agree. The catalog remains a reusable geometry contract only; UI, live cards/effects, and bespoke Boss patterns remain outside this delivery.

## Approved outcome

Deliver the exact nine-pattern reusable, engine-authoritative axial geometry catalog from [proposal 07](../product-backlog/issues/07-reusable-hex-target-pattern-acceptance-catalog.md). Geometry resolves before target filtering and exposes a stable result for future consumers; it does not add targeting UI, cards, effects, or encounter behavior.

## Delivery sequence

1. Game Design defines the catalog vocabulary, selection binding, and reference-only asset mapping in established rule documentation.
2. Architecture implements the smallest `BoardQuery`-owned resolver/result seam using that catalog.
3. Test Automation independently verifies every pattern across six facings at central and edge origins using semantic axial-coordinate assertions.

## Return protocol

Ownership transfers only after the assignee acknowledges the sender packet. Each assigned owner returns a task message to the Orchestrator at acknowledgment, on any dependency/scope-changing discovery, and on completion using the mandatory packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet). The coordinator records that return before advancing a dependent issue.

## Non-goals

No targeting or preview UI, live card/encounter behavior, runtime use of visual reference assets, or promotion of `Pinwheel`, `Stripes`, `SafeButt`, or `RaidWide` into the reusable catalog.

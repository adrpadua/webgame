# Closed Handoffs — 2026-08-15 (01)

Status: append-only historical coordination evidence. Archived from the live ledger during the first manual archive operation under Proposal 06.

This file records coordination history only. It does not supersede linked rules, content, UI, probe, product-intake, or packet-contract sources. The live operating surface remains [project-coordination.md](../project-coordination.md).

## Movement Record

- Trigger at movement: `224` physical lines and `92,648` bytes in the live ledger, exceeding both documented thresholds.
- Preconditions: Architecture, Test Automation, Game Design, UI/UX, and Product Management independently passed the archive contract review; the current packet-root validator exited `0` with `handoffs=24 errors=0` before this move.
- Eligibility: the Coordinator reverse-dependency sweep found no non-terminal feature issue or live current-work row naming the candidate subjects, their delivery issue paths, or their packet IDs as a prerequisite or dependent. Product intake, current delivery rows, packet roots, canonical-source index, active ownership, open questions, and milestone gate remain live.
- Links in this file are repository-relative. The post-migration independent safety result is recorded in the live ledger and the archive-migration QA packet.

## Pattern, Targeted-Hit, And Safe-Bounds History

| Original live-ledger subject | Terminal historical outcome and owner | Evidence / canonical sources | Closed date |
| --- | --- | --- | --- |
| Target-pattern catalog 01 — vocabulary/reference map | Game Design — completed; reference-only catalog map verified | [delivery issue](../../../.scratch/reusable-hex-target-pattern-acceptance-catalog/issues/01-define-catalog-vocabulary-and-reference-map.md); [prototype rules](../../rules/prototype-rules.md) | 2026-08-13 |
| Target-pattern catalog 02 — authoritative resolver | Architecture — completed; independent QA verified `target_patterns` | [delivery issue](../../../.scratch/reusable-hex-target-pattern-acceptance-catalog/issues/02-implement-authoritative-pattern-resolver.md); [headless SDK](../../rules/headless-rules-sdk.md) | 2026-08-14 |
| Target-pattern catalog 03 — semantic acceptance | Test Automation — completed; all nine IDs/six Facings/edge clipping passed | [delivery issue](../../../.scratch/reusable-hex-target-pattern-acceptance-catalog/issues/03-verify-core-pattern-acceptance.md); [probe harness](../probe-harness.md) | 2026-08-14 |
| Embermaw targeted-Tank-Hit conformance audit | Architecture — completed; selector gap routed without encounter retuning | [Embermaw design](../../content/encounters/embermaw-prototype.md); [headless SDK](../../rules/headless-rules-sdk.md) | 2026-08-14 |
| Targeted Tank Hit selector 01–02 | Architecture and Test Automation — completed; `content,resolver,riposte,riposte_live,records` passed and Cinder Breath remained avoidable | [implementation](../../../.scratch/targeted-boss-hit-selector-seam/issues/01-implement-targeted-tank-hit-selector.md); [verification](../../../.scratch/targeted-boss-hit-selector-seam/issues/02-verify-targeted-tank-hit-selector.md); [probe harness](../probe-harness.md) | 2026-08-14 |
| Separate mobile-layout regression | UI/UX, Architecture, and Test Automation — completed; controls were in bounds at `390x844` | [vertical slice](../embermaw-vertical-slice.md); [accessibility](../accessibility.md) | 2026-08-14 |
| Mobile safe-bounds 01–03 | Coordinator, UI/UX, Architecture, and Test Automation — completed; presentation-only revision `0003` improved prompt right inset from `0` to `62` physical pixels | [scope](../../../.scratch/harden-mobile-layout-safe-bounds/issues/01-define-safe-bounds-contract-and-scope.md); [implementation](../../../.scratch/harden-mobile-layout-safe-bounds/issues/02-implement-mobile-safe-bounds.md); [verification](../../../.scratch/harden-mobile-layout-safe-bounds/issues/03-verify-mobile-safe-bounds.md); [active packet revision](../handoff-packets/pilot-01-mobile-safe-bounds-ui/revisions/0003/) | 2026-08-14 |
| Mobile safe-bounds 03 preclosure blocker | Historical `blocked` route note, superseded by the final independent PASS above; it is retained to preserve the failed-then-remediated evidence path, not as current work | [verification issue](../../../.scratch/harden-mobile-layout-safe-bounds/issues/03-verify-mobile-safe-bounds.md); [accessibility](../accessibility.md) | 2026-08-14 |
| Target-bound patterns 01–04 | Coordinator, Game Design, Architecture, and Test Automation — completed; no-live-content Tank-facing resolver/probe contract passed | [delivery spec](../../../.scratch/target-bound-boss-patterns-through-tank/spec.md); [prototype rules](../../rules/prototype-rules.md); [headless SDK](../../rules/headless-rules-sdk.md); [probe harness](../probe-harness.md) | 2026-08-14 |

## First-Loadout And Handoff-Control History

| Original live-ledger subject | Terminal historical outcome and owner | Evidence / canonical sources | Closed date |
| --- | --- | --- | --- |
| First-turn loadout 01–04 | UI/UX, Architecture, Test Automation, Coordinator/Playtester — completed; `Play` primary, Help secondary, visible `?` remediation and focused newcomer retest passed; Undo remains out of scope | [delivery spec](../../../.scratch/improve-first-turn-loadout-comprehension/spec.md); [newcomer observation](../../../.scratch/improve-first-turn-loadout-comprehension/issues/04-newcomer-observation.md); [vertical slice](../embermaw-vertical-slice.md); [accessibility](../accessibility.md) | 2026-08-14 |
| First-turn loadout 05–08 | UI/UX, Architecture, Test Automation, Coordinator/Playtester — completed; rendered Help, presentation boundary, independent acceptance, and retest packets form Pilot 3's final path | [UI packet](../handoff-packets/pilot-03-first-loadout-help-affordance-ui/); [Architecture packet](../handoff-packets/pilot-03-first-loadout-help-affordance-architecture/); [QA packet](../handoff-packets/pilot-03-first-loadout-help-affordance-qa/); [retest packet](../handoff-packets/pilot-03-first-loadout-playtester-retest/) | 2026-08-14 |
| Deterministic handoff control plane / Pilot 4 / Pilot 5 | Coordinator and Test Automation — Phase 0 completed; immutable JSON-plus-supersession v1 and mandatory gate activated only after independent rollout PASS | [completed delivery spec](../../../.scratch/deterministic-handoff-control-plane-and-closure-gate/spec.md); [packet contract](../handoff-packets.md); [Pilot 4 QA](../handoff-packets/pilot-04-phase0-docs-alignment-qa/); [Pilot 5 QA](../handoff-packets/pilot-05-advisory-rollout-qa/) | 2026-08-14 |

## Tutorial-Prompt And Focused-Rules-Probe History

| Original live-ledger subject | Terminal historical outcome and owner | Evidence / canonical sources | Closed date |
| --- | --- | --- | --- |
| Tutorial prompts 01–04 and 05 | Game Design, Architecture, UI/UX, Test Automation, and Playtester — completed; seven authoritative prompts, portrait card/history, deterministic QA, and hands-on review passed without gameplay or record authority drift | [delivery spec](../../../.scratch/contextual-mobile-tutorial-prompts-embermaw/spec.md); [projection QA packet](../handoff-packets/tutorial-prompts-authoritative-projection-qa/); [portrait UI QA packet](../handoff-packets/tutorial-prompts-portrait-history-qa/); [Playtester packet](../handoff-packets/tutorial-prompts-playtester/); [vertical slice](../embermaw-vertical-slice.md); [accessibility](../accessibility.md) | 2026-08-15 |
| Focused Encounter rules-Probe proof | Test Automation and Architecture — completed; scene-free end-of-clock evidence uses 40 deterministic advances and a stable artifact | [delivery spec](../../../.scratch/focused-encounter-rules-probes/spec.md); [implementation issue](../../../.scratch/focused-encounter-rules-probes/issues/01-author-proof-of-value-focused-rules-probe.md); [review issue](../../../.scratch/focused-encounter-rules-probes/issues/02-review-focused-rules-seam-and-proof.md); [probe harness](../probe-harness.md) | 2026-08-14 |

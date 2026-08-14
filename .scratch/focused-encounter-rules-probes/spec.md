# Focused Encounter Rules Probes

Status: resolved

## Problem Statement

The current Spike and Probe harness is strong at protecting large, decided contracts: replay, Encounter Records, player-facing presentation, and a growing set of authored mechanics. What it does not yet make cheap is the kind of tiny, deterministic rules checks that let a team add many single-mechanic assertions without paying the setup cost of a full acceptance Probe every time.

That gap matters because the project's rules are becoming more expressive: Boss Beats carry authored identity, Slots keep persistent state across Windows, Status Effects have exact trigger and expiry boundaries, and Minion/Hazard interactions are increasingly specific. Today, the team can prove these behaviors, but focused rule coverage is still relatively expensive to author and organize. As content grows, that cost will slow delivery, make regressions harder to isolate, and encourage overloading a few broad Probes with too many responsibilities.

Duelyst's useful lesson is not its PvP stack or its backend-heavy test organization. The useful lesson is that exact board state plus one authored action plus direct rules assertions can make a large rules surface testable at high volume. This repo needs that leverage in its own vocabulary and architecture: scene-free Encounter authority, externalized Probe support, deterministic artifacts, and Godot headless execution.

## Solution

Add a focused rules-Probe layer that sits between one-off Spikes and broad acceptance Probes.

## Approved Delivery Boundary

The current delivery is deliberately smaller than the draft's future-tranche examples: it must establish the documented three-layer model and complete exactly one proof-of-value focused rules Probe for an existing defeat/attrition or end-of-clock contract. Rejection/no-rules-state-change evidence is required only when that selected contract has an applicable illegal-action boundary. Any broader first tranche, record/replay deepening, or additional mechanic family is deferred unless the selected proof demonstrates a necessary authoritative fact gap and follows canonical review plus independent verification.

This layer will let Test Automation author many small deterministic Encounter scenarios against the existing scene-free rules seam, using exact setup fixtures, one or a few authored actions, explicit expected outcomes, and stable failure artifacts. These focused rules Probes will protect single mechanics and invalid-action boundaries without creating a second gameplay implementation or moving test helpers into production rules code.

The result should be a three-level harness:

1. Spikes answer a short-lived question and are deleted or promoted.
2. Focused rules Probes protect one mechanic, rejection case, or lifecycle boundary at the Encounter rules seam.
3. Broad acceptance Probes continue to protect replay, Encounter Record, parity, production-resource reachability, and player-visible presentation.

This keeps the current architecture intact while borrowing the best part of Duelyst's strategy: cheap, exact, repeatable rules assertions.

## User Stories

1. As Test Automation, I want to author a tiny deterministic Encounter scenario around one mechanic, so that I can prove a rule without building a full acceptance flow.
2. As Test Automation, I want to express exact setup fixtures and one authored action, so that failures point to the mechanic under test instead of a long script.
3. As Test Automation, I want focused rejection assertions beside happy-path assertions, so that invalid actions stay protected as first-class rules behavior.
4. As Test Automation, I want focused Probes to emit stable normalized artifacts, so that I can diagnose regressions from rules facts rather than scene guesses.
5. As Test Automation, I want focused rules Probes to reuse the same Encounter authority as the playable game, so that I do not maintain a second rules path.
6. As Test Automation, I want to group focused Probes by mechanic family, so that I can run a bounded subset during red-green work and a broader subset for regression.
7. As Architecture, I want focused rules coverage to stay outside the Encounter Engine except for narrow public seams already justified by gameplay, so that test support does not leak into production rules ownership.
8. As Architecture, I want the highest useful seam to remain the scene-free Encounter layer rather than unit-testing deep internals directly, so that tests survive internal refactors.
9. As Design, I want new Boss mechanics and Hero mechanics to earn focused deterministic evidence before UI polish, so that authored rules become stable faster.
10. As Design, I want focused Probes to show exact trigger, expiry, payoff, and rejection facts, so that I can validate intended behavior without reading implementation code.
11. As PM, I want mechanic slices to have smaller, clearer proof points, so that I can tell whether a feature is blocked on rules, presentation, or evaluation rather than on vague "test debt."
12. As the user, I want the harness to grow in a way that preserves the current Probe philosophy, so that we deepen confidence without inventing a new framework to babysit.
13. As a future mechanic author, I want a documented pattern for "arrange exact Encounter state, perform one action, assert one contract," so that I can add coverage quickly and consistently.
14. As a future QA verifier, I want every focused Probe to advertise one crisp contract and one stable success marker, so that verification runs are legible and bounded.
15. As a scene/UI owner, I want focused rules Probes to catch rules regressions before they appear as misleading UI failures, so that presentation work is not blamed for engine drift.
16. As a replay and records maintainer, I want focused rules Probes to preserve normalized action and state semantics, so that replay and Encounter Record contracts do not diverge from rules assertions.
17. As a playtester, I want eventual pass/attrition and failure-state mechanics to be explicitly covered by deterministic rules evidence, so that "the boss eventually kills the party" is protected as authored behavior, not assumed.
18. As the team, I want broad acceptance Probes to stay small and purposeful, so that they remain trustworthy integration evidence instead of becoming giant catch-all scripts.

## Implementation Decisions

- The primary seam remains the existing scene-free Encounter rules seam. Focused rules Probes should drive authored setup and actions through the same public Encounter start, action-application, and phase-advance path that broad rules Probes already use.
- The Probe harness remains outside production rules ownership. Focused rules authoring, fixture setup, normalization, and failure-artifact generation stay in the debug/probe layer rather than becoming gameplay interfaces.
- The harness gains a named category for focused rules Probes. These are durable Probes, not Spikes, and they protect one mechanic family, one lifecycle boundary, or one invalid-action contract at a time.
- The scenario authoring interface stays small and declarative. It should express setup fixtures, one or more authored steps, and exact expectations without exposing deep engine internals or requiring scene orchestration.
- Focused rules Probes should prefer exact rules facts over inferred snapshot deltas. When a mechanic already exposes authoritative Resolution Facts or normalized action facts, assertions should bind to those facts first and use snapshots only where no authoritative fact exists.
- Rejection behavior is a first-class contract. Focused rules Probes should support explicit expected rejection reasons and no-rules-state-change assertions for illegal actions.
- Focused rules Probes should be organized by mechanic family rather than by broad feature slice alone. Examples include Slot lifecycle, Status Effect lifecycle, Boss Beat authored context, Minion/Hazard interaction, defeat/end-of-clock behavior, and card-specific payoff rules.
- The first tranche should target gaps where the current suite is broad but not yet fine-grained. That includes attrition or pass-to-defeat behavior, narrow invalid-action matrices, and mechanics that currently share one larger acceptance Probe.
- Broad acceptance Probes remain the contract for production-resource reachability, replay equality, Encounter Record schema/report behavior, parity, and player-visible presentation. Focused rules Probes do not replace those contracts.
- Probe cataloging should preserve stable human-meaningful names and focused run entry points. Teams should be able to run only the relevant mechanic family during implementation without invoking unrelated UI or report coverage.
- Failure artifacts remain normalized and Git-ignored. Focused rules Probes should produce the same style of diagnosis packet as the broader harness so that regression analysis stays consistent across the suite.
- Documentation should describe when to choose a Spike, a focused rules Probe, or a broad acceptance Probe. The distinction is part of the productized harness, not tribal knowledge.

## Testing Decisions

- A good test in this feature proves external Encounter behavior: whether authored setup, action legality, Resolution Facts, Slot state, Status Effect lifecycle, defeat state, or Encounter outcome matches the contract. It should not assert private helper structure or internal call ordering.
- The main test target is the focused rules-Probe layer itself: can the team cheaply author deterministic single-mechanic coverage at the Encounter seam while preserving stable artifacts and success markers.
- The second test target is catalog behavior: focused rules Probes must be discoverable, runnable in bounded groups, and clearly separated from broad acceptance Probes and short-lived Spikes.
- The third test target is documentation and usage guidance: the harness docs should make the selection rule clear enough that authors consistently choose the right layer.
- Prior art in this repo already exists and should be reused rather than replaced: broad rules coverage, replay scenarios, Whelp Clear and Slow cleanup scenario coverage, Riposte engine and production-resource coverage, Encounter Record probes, parity checks, and scene/UI probes.
- Prior art from Duelyst is the shape of the rules assertions, not the stack itself: tiny arranged state, one authored action, direct state or validity assertions, repeated many times. This spec adopts that test economy at the Encounter scenario seam rather than importing Duelyst's backend-oriented unit/integration split.
- The initial focused-Probe rollout should include at least one defeat/attrition contract, at least one invalid-action matrix, and at least one lifecycle-focused mechanic that was previously protected mainly by a broader Probe.
- Focused rules Probes must be deterministic by construction. They should use fixed setup, fixed authored actions, and seeded behavior where applicable, with stable output markers and normalized failure artifacts.
- Regression strategy should stay layered: focused rules Probes catch narrow mechanic regressions early; broad acceptance Probes confirm that the same mechanics still compose correctly in replay, records, and presentation.

## Out of Scope

- Replacing the current Spike and Probe harness with a different testing framework.
- Moving Probe helpers into production Encounter ownership.
- Deep internal unit tests for private engine methods as the default strategy.
- Recreating Duelyst's server, PvP, backend, or broad mocha-style stack structure.
- Broad analytics, telemetry, or dashboard work.
- Content tuning, deck changes, balance changes, or new gameplay rules beyond the harness needed to prove existing rules.
- UI-owned changes except where a documented broad acceptance Probe already protects a player-visible contract.
- Changing Encounter Record schema or replay contracts unless a focused rules-Probe requirement genuinely exposes a missing authoritative rules fact.

## Further Notes

- The seam choice in this spec is deliberate: one primary seam for focused rules evidence at the Encounter scenario/engine boundary, plus the already-existing broad scene/UI Probes for parity and presentation. That is the smallest shape that captures the useful part of Duelyst's strategy without duplicating authority.
- The first concrete "proof of value" should be a focused defeat/attrition Probe for repeated pass behavior or another bounded end-of-clock loss path, because that answers a current coverage question while exercising the proposed layer in a very legible way.
- If the team later wants card-by-card focused coverage similar to Duelyst's faction/card files, that should be an incremental expansion of this layer, not a separate test architecture.

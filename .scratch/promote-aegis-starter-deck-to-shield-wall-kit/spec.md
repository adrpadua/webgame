# Promote Elian starter Deck to the Shield Wall Kit

Status: resolved

## Intake

Authorized product proposal: [`.scratch/product-backlog/issues/04-promote-aegis-starter-deck-to-shield-wall-kit.md`](../product-backlog/issues/04-promote-aegis-starter-deck-to-shield-wall-kit.md), approved by the user on 2026-08-13.

## Delivery Outcome

Replace the live/default Elian Voss deck in `resources/encounters/embermaw_prototype.tres` with exactly `8x Steady Strike`, `6x Iron Guard`, `2x Sweeping Blow`, `2x Fortify`, and `2x Shield Slam`.

This is a distinct default-content decision. It does not rewrite the historically closed two-card baseline result or silently merge proposal 03's evaluation-only authorization.

## Sequence And Boundaries

1. Design reconciles canonical current-default wording and marks the old `10x/10x` baseline historical.
2. Architecture applies the smallest content-only migration after that intent handoff, preserving validated Riposte and evaluation seams.
3. Test Automation independently verifies the exact default composition and focused regressions.
4. The coordinator reconciles proposal 03: retain an evaluation-only resource only when it is useful as an explicitly non-default historical/repro fixture; do not treat it as the default resource.

## Non-Goals

No card-value or rule change, encounter pacing, seed, hand guarantee, teaching-order change, deckbuilding/progression work, Interception/multi-Hero scope, or inferred balance/promotion conclusion.

## Shared Contracts

- Product authority: `.scratch/product-backlog/issues/04-promote-aegis-starter-deck-to-shield-wall-kit.md`
- Domain/content truth: `CONTEXT.md`, `docs/content/heroes/elian-voss-design.md`, `docs/content/decks/elian-voss-starter.md`, `docs/rules/character-design-bible.md`, `docs/content/deck-evaluation-rubric.md`, and `docs/content/first-content-pass.md`
- Deterministic validation: `docs/artifacts/probe-harness.md` and the existing content/probe contracts
- Cross-task state: `docs/artifacts/project-coordination.md`

## Closure Gate

Close only after the default resource, canonical docs, and independent deterministic evidence agree on the exact five-identity 20-card list. Preserve the prior baseline and proposal-03 evidence as historical records, with their scope stated accurately.

## Closure

Design issue 01, Architecture issue 02, and Test Automation issue 03 are resolved. The default resource and canonical documents agree on the approved Shield Wall list; focused independent QA evidence and coordinator rerun passed. The former `10x/10x` baseline and the proposal-03 controlled resource remain historical evidence, not competing default-deck definitions.

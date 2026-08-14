# Confirm Riposte Ready Rule Contract

Status: resolved
Owner: Game Design

## Outcome

Record the approved Riposte Ready lifecycle once in the canonical domain/content sources: qualifying Boss Tank Hit, Guarded Front and zero-Health-loss grant conditions, non-stacking/non-refreshing behavior, first-following-Quick expiry, and automatic legal Shield Slam consumption for `+2` Boss damage.

## Canonical Sources

- `CONTEXT.md`
- `docs/content/heroes/elian-voss-design.md`
- `docs/rules/character-design-bible.md`

## Required Handoff

Send Architecture and QA the exact trigger/expiry/consumption boundary, terminology, edge cases, and required Resolution Facts. Identify confirmed decisions, assumptions, and superseded language. Architecture verifies implementability without redefining the rule.

## Non-Goals

No general posture or Awakening category, new resource meter, Interception, Armor conversion, card implementation, or expanded-deck promotion.

## Acceptance

Canonical documents agree with the approved product issue, use existing domain vocabulary, and contain no UI-only or implementation-only rule.

## Comments

- 2026-08-13: Game Design updated `CONTEXT.md`, `docs/content/heroes/elian-voss-design.md`, and `docs/rules/character-design-bible.md` with the exact approved lifecycle and non-goals.
- 2026-08-13: Coordinator comparison and `git diff --check` passed. Architecture independently confirmed the contract is internally consistent and implementable: Tank Hit identity is authored, Guarded Front is a board predicate, and grant, expiry, and consumption have deterministic engine boundaries. Issue 02 is unblocked.

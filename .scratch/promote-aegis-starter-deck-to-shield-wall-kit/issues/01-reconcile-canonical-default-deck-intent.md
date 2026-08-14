# Reconcile Canonical Default-Deck Intent

Status: resolved
Owner: Game Design

## Outcome

Make the approved Shield Wall list the documented current live/default Elian starter deck, while preserving the old two-card baseline and proposal-03 evaluation-only authorization as historical records.

## Canonical Sources

- `CONTEXT.md`
- `docs/content/heroes/elian-voss-design.md`
- `docs/content/decks/elian-voss-starter.md`
- `docs/rules/character-design-bible.md`
- `docs/content/deck-evaluation-rubric.md`
- `docs/content/first-content-pass.md`
- Approved product proposal 04

## Acceptance

The current default is exactly `8x Steady Strike`, `6x Iron Guard`, `2x Sweeping Blow`, `2x Fortify`, and `2x Shield Slam`; the old `10x/10x` result remains historical and is not recast as a feature failure. Proposal 03's evaluation-only boundary is explicitly superseded only for default adoption, not erased as evidence history.

## Non-Goals

No live resource edit, value/rule change, tuning conclusion, or teaching/pacing change.

## Handoff

Design reconciled the canonical intent without editing the runnable resource. Updated paths are `docs/content/heroes/elian-voss-design.md`, `docs/content/decks/elian-voss-starter.md`, `docs/rules/character-design-bible.md`, `docs/content/deck-evaluation-rubric.md`, and `docs/content/first-content-pass.md`; `CONTEXT.md` remains unchanged because no rules term or Riposte/Shield Slam contract changed.

The documents state the approved `8/6/2/2/2` default specification, retain the `10x/10x` result as historical baseline evidence, and explicitly say `resources/encounters/embermaw_prototype.tres` still needs Architecture migration. Proposal 03 is superseded only for default adoption; its controlled evidence remains historical.

Independent coordinator check: exact-list/history reads were consistent and `git diff --check` on the canonical-doc set exited `0` (line-ending notices only). Issue 02 is unblocked.

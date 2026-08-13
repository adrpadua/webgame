# Controlled Aegis Test-Deck Evaluation Cohort

Status: active

## Intake

Authorized product proposal: [`.scratch/product-backlog/issues/03-controlled-aegis-test-deck-evaluation.md`](../product-backlog/issues/03-controlled-aegis-test-deck-evaluation.md), approved by the user on 2026-08-13.

The documented 20-card list was authorized as evaluation-only under proposal 03. Proposal 04 later adopted the same list as the live/default starter deck; this delivery remains a distinct controlled historical/repro cohort and must not blur its evidence with promoted-default evidence or imply balance, encounter, seed, starting-hand, or teaching-pacing changes.

## Delivery Outcome

Run one fixed-seed, one-fingerprint cohort using exactly `8x Steady Strike`, `6x Iron Guard`, `2x Sweeping Blow`, `2x Fortify`, and `2x Shield Slam`. Produce deterministic Encounter Record/report evidence and one Design review recommendation about the controlled candidate only.

## Sequence And Boundaries

1. Architecture retains the smallest reversible, clearly evaluation-only historical/repro deck/configuration seam and documents it in existing record/probe contracts if necessary.
2. Test Automation independently verifies exact composition, evaluation-only isolation, deterministic seeds, fingerprint integrity, and canonical report linkage.
3. Design reviews the verified cohort against the rubric and writes the human note. Whelp-clear and Fortify/Slow remain supporting-contract context unless directly evidenced.
4. UI/UX re-enters only for a genuine presentation/readability finding.

## Shared Contracts

- Product authority: `.scratch/product-backlog/issues/03-controlled-aegis-test-deck-evaluation.md`
- Aegis design and list: `docs/content/heroes/aegis-guardian-design.md`
- Authoring constraints: `docs/rules/character-design-bible.md`
- Evaluation rubric and measurement: `docs/content/deck-evaluation-rubric.md`, `docs/artifacts/deck-evaluation-measurement-plan.md`
- Report/probe contracts: `docs/artifacts/encounter-records.md`, `docs/artifacts/probe-harness.md`
- Cross-task state: `docs/artifacts/project-coordination.md`

## Closure Gate

Close only when the candidate’s exact 20-card composition, non-default boundary, fixed-seed record/report evidence, and Design note agree. The final result is an evaluation recommendation only; any default-deck, tuning, or content decision returns to PM and the user.

# Combat Postures — Aegis Guardian First Slice

Status: active

## Intake

Authorized product proposal: [`.scratch/product-backlog/issues/01-combat-postures-aegis-guardian.md`](../product-backlog/issues/01-combat-postures-aegis-guardian.md), approved by the user on 2026-08-13.

The confirmed outcome and explicit non-goals in that proposal are fixed delivery constraints. Any material outcome change returns to Product Management and the user.

## Delivery Outcome

Captain Elian Voss earns one visible, non-stacking, non-refreshing **Riposte Ready** Status Effect when a Boss Beat authored as a **Tank Hit** resolves against him while he occupies the **Guarded Front** and loses `0` Health. It expires at the end of the first Quick Window after the hit. A legal **Shield Slam** automatically consumes it for `+2` Boss damage. The UI and Encounter Record make its trigger, duration, expiry, consumption, and payoff legible.

## Sequence And Boundaries

1. Game Design confirms the exact rule lifecycle and canonical vocabulary.
2. Architecture defines and implements the smallest reusable event, Status Effect, board-condition, Resolution Fact, and Encounter Record seam. No general posture framework.
3. QA independently proves grant, non-grant, non-stack, non-refresh, expiry, consumption, record, and regression behavior.
4. UI/UX projects the authoritative Status Effect and reasons after the active board-camera shared-file handoff closes. UI creates no rules authority.
5. Design and QA run the controlled three-run deck evaluation. The expanded deck is not promoted unless both scores reach `3/5`, meaningful Slot decisions occur in most post-Loadout Rounds, and no dominant always-Shield-Slam sequence appears.

## Shared Contracts

- Rules and terms: `CONTEXT.md`
- Aegis intent: `docs/content/heroes/aegis-guardian-design.md`
- Hero authoring constraints: `docs/rules/character-design-bible.md`
- UI/accessibility: `docs/artifacts/embermaw-vertical-slice.md`, `docs/artifacts/accessibility.md`
- Validation: `docs/artifacts/probe-harness.md`
- Records: `docs/artifacts/encounter-records.md`
- Evaluation: `docs/content/deck-evaluation-rubric.md`, `docs/artifacts/deck-evaluation-measurement-plan.md`
- Cross-task state: `docs/artifacts/project-coordination.md`

## Closure Gate

Close only when canonical rules, implementation, visible presentation, deterministic automated evidence, Encounter Record facts, and three human-reviewed deck runs agree. Every shared-file handoff requires an independent verifier and recorded evidence.

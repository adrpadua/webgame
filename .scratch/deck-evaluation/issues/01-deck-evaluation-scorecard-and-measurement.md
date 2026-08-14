# Deck Evaluation Scorecard And Measurement Plan

Type: task
Status: resolved
Owner: Design + QA Automation

## Request

Review and operationalize the prototype deck-evaluation scorecard for Elian Voss and future early decks.

## Canonical Inputs

- [docs/content/deck-evaluation-rubric.md](../../../docs/content/deck-evaluation-rubric.md)
- [docs/artifacts/deck-evaluation-measurement-plan.md](../../../docs/artifacts/deck-evaluation-measurement-plan.md)
- [docs/artifacts/deck-eval-notes/README.md](../../../docs/artifacts/deck-eval-notes/README.md)
- [docs/artifacts/encounter-records.md](../../../docs/artifacts/encounter-records.md)
- [docs/artifacts/probe-harness.md](../../../docs/artifacts/probe-harness.md)

## Acceptance

- Design confirms the Viability and Play-feel scoring rubric is sufficient for the Embermaw teaching slice.
- QA confirms which metrics are already measurable from Encounter Records and which require focused reporting/probe work.
- QA confirms the baseline seed labels and human-note convention are sufficient for repeatable execution.
- Architecture receives a minimal gap list before any reporting implementation begins.
- The live deck is not expanded solely on subjective discussion; scorecard evidence is required.

## Comments

- 2026-08-13: Created from orchestration request. This issue tracks backlog ownership; it does not authorize broad engine analytics or HUD scoring.
- 2026-08-13: Design and QA review passed. Remaining work is implementation of the minimal reporting/probe gaps listed in `docs/artifacts/deck-evaluation-measurement-plan.md`.

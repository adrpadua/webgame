# Coordination Ledger Lifecycle and Archive

Status: ready-for-agent

## Player Problem

`docs/artifacts/project-coordination.md` is the live source of truth for cross-role coordination, ownership, blockers, and closure state. It already mixes active control-plane information with detailed closed-handoff evidence, and that makes the file progressively harder for the Orchestrator to use as a fast operating surface.

If the same file remains both the live coordination interface and the permanent detailed history, routine backlog sweeps become slower, active state becomes harder to scan, and the team risks treating historical evidence as if it were still active control-plane state.

## Desired Outcome

Keep `docs/artifacts/project-coordination.md` as the small, fast live coordination interface, while preserving closed-handoff history in a durable append-only archive under `docs/artifacts/coordination-history/`.

The process-facing promise is:

- the Orchestrator reads the live ledger on every sweep for current state;
- closed-handoff detail remains preserved and linkable for regression, history, and audit work;
- the live ledger keeps only compact closure summaries plus durable links to archived history; and
- archival never races active work or silently changes product-approval authority.

Archive trigger:

- archive at milestone closure, or
- archive when the live ledger exceeds `200` lines or `75 KB`,
- whichever comes first.

## Scope

- Define the lifecycle split between the live coordination ledger and append-only coordination-history archives.
- Keep the live ledger focused on:
  - canonical-source index;
  - active, blocked, and awaiting-verification work;
  - temporary shared-file ownership;
  - current open questions and assumptions; and
  - milestone gates.
- Define how compact closure summaries in the live ledger link to archived closed-handoff detail.
- Define the archival trigger, operator responsibility, and safe migration boundary for closed coordination history.
- Preserve the current Orchestrator sweep model: live ledger first, archives only when historical context is actually needed.

## Explicit Non-Goals

- Deleting or discarding historical coordination evidence.
- Creating a second authoritative source for rules, probes, UI behavior, or implementation contracts.
- Adding automatic archival that could race active work or silently move still-live state.
- Changing PM/user product-approval authority or the PM-to-EM handoff boundary.
- Replacing the coordination ledger with a different workflow, tracker, or dashboard.
- Broad workflow automation or implementation in this proposal.

## Acceptance Evidence

Before this proposal can close as delivered, evidence must show that:

1. `docs/artifacts/project-coordination.md` is reduced to a compact live-operations surface that keeps the canonical-source index, active/blocked/awaiting-verification work, temporary shared-file ownership, current open questions, and milestone gates.
2. Closed-handoff detail is preserved in append-only files under `docs/artifacts/coordination-history/` rather than deleted or paraphrased away.
3. The live ledger keeps durable compact closure summaries that link directly to the archived detailed history for each archived block or milestone slice.
4. The Orchestrator can perform routine sweeps from the live ledger alone and only consult archives for regression, history, or audit work.
5. The archive trigger is documented as milestone closure or live-ledger size greater than `200` lines or `75 KB`, whichever happens first.
6. The archival process cannot move active, blocked, or awaiting-verification work into history by accident, and does not weaken the current product-approval or delivery-authority split.

## Affected Areas

| Area | Product/process impact |
| --- | --- |
| Product Management | Preserves the PM backlog as intake authority while keeping the live coordination surface readable after handoff. |
| Orchestrator | Gains a smaller, faster live control plane for sweeps and closure routing, with durable archive links for historical lookup. |
| Architecture | Keeps durable implementation-history access for regressions and seam audits without bloating the active ledger. |
| Test Automation | Retains historical validation and handoff evidence through append-only archives while the live ledger stays operationally small. |
| Game Design | Keeps access to past closure and evidence context without mixing it into active coordination state. |
| UI/UX | Preserves historical player-facing verification context while keeping current ownership and blockers easy to scan. |
| Engineering Enablement | May own the bounded archive/lifecycle mechanism if approved, but does not become a second authority source. |

## Canonical Documents To Consult Or Update

- [Project coordination ledger](../../../docs/artifacts/project-coordination.md): current live coordination control plane.
- [Issue tracker](../../../docs/agents/issue-tracker.md): PM-to-EM intake and delivery-boundary authority.
- [Engineering enablement operating contract](../../../docs/agents/engineering-enablement.md): bounded reusable coordination/tooling work.
- [Recovery kit](../../../docs/agents/recovery-kit.md): Orchestrator sweep expectations and durable routing behavior.
- [Risk-tiered validation proposal](02-risk-tiered-validation-and-orchestrator-closure.md): related process authority for ledger field shape and closure behavior.

## Open Product/Process Decisions

- No additional PM-level design choice is required beyond user approval of this proposal as written.
- On approval, delivery may choose the smallest safe archive-file granularity and naming convention, as long as the history is append-only and live-ledger links remain durable.

## Risks And Dependencies

- If the live ledger and archive boundary is too fuzzy, the team could split active state across two places and make sweeps less reliable rather than more reliable.
- If closure summaries are too thin, archived history becomes harder to rediscover during regressions or audits.
- If archive movement is attempted too early or too often, active dependencies could be hidden from routine coordination work.
- This proposal depends on keeping the existing rule that canonical rules, probe contracts, UI behavior, and implementation documents remain authoritative in their own sources rather than being copied into coordination history.

## Approval Record

On 2026-08-13, the user asked PM to create a delivery-process proposal for a coordination-ledger lifecycle and archive system, keep it `needs-triage`, and avoid changing the live ledger or workflow implementation yet. Later on 2026-08-13, the user explicitly approved proposal 06 for delivery planning. This item is now `ready-for-agent`. The Orchestrator must acknowledge this exact path, create separate implementation tracking, preserve the confirmed process outcome and non-goals, and return any material process-authority or workflow-boundary change to PM and the user.

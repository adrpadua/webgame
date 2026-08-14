# Engineering Enablement

Status: confirmed cross-functional responsibility. It is not a permanent agent or task.

Engineering Enablement improves reusable tools, contracts, and validation that help Design, UI/UX, Test Automation, and Architecture ship game slices reliably.

## Ownership

- Architecture owns engine-facing tool seams and authoring or reporting contracts.
- Test Automation owns repeatable validation, probe registration, and evidence quality.
- The project coordinator owns prioritization, dependency routing, source-of-truth links, and closure gates.
- Design and UI/UX are bounded users and independent verifiers when an enablement item supports their workflow.

Use the existing Architecture, Test Automation, Design, and UI/UX tasks. Propose a dedicated task only when the enablement backlog is sustained, independently actionable, and repeatedly blocks gameplay work; creation still requires user direction.

## Enablement Handoff Contract

Before work begins, record the item in `docs/artifacts/project-coordination.md` with an `Engineering Enablement —` prefix and all standard evidence-ledger fields. The row must identify:

1. A bounded user and the workflow or slice being enabled.
2. A small interface or contract and its owning task.
3. One canonical document for the durable contract.
4. Focused validation with an exact command and expected evidence.
5. Explicit non-goals that bound the work.
6. An independent user or verifier responsible for the final handoff check.

Implementation details, rules, UI behavior, and test contracts remain in their established canonical documents. The coordination row links to those sources and records ownership, dependencies, evidence, and verification time.

When the enablement item is a delivery-control or handoff-validation seam, use `docs/artifacts/handoff-packets.md` as the canonical packet contract. Packet files under `docs/artifacts/handoff-packets/<handoff-id>/` are durable evidence; the coordination ledger remains an index and must not become the schema definition.

Focused rules-Probe pilot reflection: when an enablement item is proving one narrow, existing Encounter rule, prefer the thinnest reusable evidence layer first. Add a scene-free focused Probe against public authority before proposing broader scenario/report/UI work or a new engine seam, and document that routing choice in the canonical harness rather than scattering it across issue comments.

## Closure Gate

An Engineering Enablement handoff closes only when:

- the bounded user can complete the named workflow through the documented interface;
- the owner has updated the canonical contract;
- focused validation passes with recorded evidence;
- any required handoff packet validates against the advisory packet contract;
- the independent user or verifier confirms the handoff;
- implementation, documentation, and validation agree;
- the result stays within its stated non-goals.

If any condition is missing, keep the handoff active or blocked with an explicit owner and next action.

## Non-Goals

- A general-purpose platform, analytics system, or speculative framework.
- A new gameplay rule hidden inside tooling, UI, reports, or probes.
- Replacement of Architecture, Test Automation, Design, or UI/UX ownership.
- A permanent Engineering Enablement agent for isolated or occasional work.

# Coordination Ledger Lifecycle and Archive

Status: active

## Intake

Authorized product proposal: [`.scratch/product-backlog/issues/06-coordination-ledger-lifecycle-and-archive.md`](../product-backlog/issues/06-coordination-ledger-lifecycle-and-archive.md), approved by the user on 2026-08-13.

## Delivery Outcome

Keep `docs/artifacts/project-coordination.md` a compact live-operations index. Preserve closed-handoff detail in append-only `docs/artifacts/coordination-history/` files, linked from compact live closure summaries.

The archive trigger is milestone closure or a live ledger exceeding `200` lines or `75 KB`, whichever comes first. Never move active, blocked, or awaiting-verification work into history.

## Sequence And Boundaries

1. Coordinator defines a smallest safe archive structure, contents boundary, trigger, and live-ledger index format without moving content yet.
2. Architecture, Test Automation, Design, UI/UX, and PM review role-specific historical lookup, link durability, and active-work safety.
3. Coordinator performs the first append-only archive/migration only after independent review; it preserves all closed detail and leaves a compact closure index in the live ledger.
4. Test Automation independently checks links, trigger accounting, append-only safety, and the live-ledger sweep path. The coordinator verifies current active work remains live.

## Non-Goals

No deletion, rules/probe/UI/architecture contract duplication, automatic archival, workflow replacement, PM/user authority change, or moving active work to history.

## Shared Contracts

- Product authority: `.scratch/product-backlog/issues/06-coordination-ledger-lifecycle-and-archive.md`
- Live coordination state: `docs/artifacts/project-coordination.md`
- Archive history: `docs/artifacts/coordination-history/`
- Intake boundary: `docs/agents/issue-tracker.md`
- Cross-functional enablement boundary: `docs/agents/engineering-enablement.md`
- Recovery behavior: `docs/agents/recovery-kit.md`

## Closure Gate

Close only after the live ledger is compact and usable for routine sweeps; closed detail is append-only archived and durably linked; no active work was archived; the documented threshold and safe-move boundary agree across the relevant process documents; and independent link/safety validation passes.

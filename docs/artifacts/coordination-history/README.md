# Coordination History Archive

This directory preserves append-only historical coordination evidence. It is not a source of truth for rules, cards, encounters, UI behavior, probes, implementation contracts, or product approvals; those remain in their canonical sources. The live operating surface is [project-coordination.md](../project-coordination.md).

## Trigger and operator

The Coordinator evaluates archival after a milestone closes and whenever the live ledger exceeds either `200` physical lines or `75 KB`, whichever happens first. Count physical lines with `(Get-Content docs/artifacts/project-coordination.md).Count`; do not use `Measure-Object -Line`, which excludes blank lines. The operation is manual: no script, dashboard, or validator moves entries automatically.

## File shape and durable links

Create a new repository-relative Markdown file named `YYYY-MM-DD-closed-handoffs-<sequence>.md` for each manual archive operation. Files are append-only after creation.

Each archived handoff block retains its original terminal status, owners, closed date, evidence commands or artifact links, and canonical-source links. It must identify the original live-ledger subject and preserve material historical distinctions, including baseline, controlled evaluation/repro, and promoted-default evidence. Use relative links only; never use absolute paths or line-number-only locators.

For every archived block, leave one compact live closure summary in the ledger with the handoff subject, terminal outcome, closed date, affected canonical source(s), and a relative link to the archive file and its block anchor.

## Eligibility and safe manual movement

A candidate is eligible only when all of the following are true at movement time:

1. Its delivery issue is terminal and its recorded handoff is closed.
2. It is not active, blocked, assigned, queued, awaiting verification, or otherwise named as a prerequisite or dependent by a live row.
3. It is not the live canonical-source index, current open-question/assumption list, active ownership table, milestone gate, or a current product-intake record.
4. The archive block will preserve its evidence and canonical links without copying authoritative technical/product contract text.

Before editing the live ledger, the Coordinator performs and records a reverse-dependency sweep: search all non-terminal feature issues and every live ledger row for the exact candidate subject, issue path, packet ID, and dependency names. Any remaining live dependency, even if the candidate's own status is terminal, keeps it live. The Coordinator also records the pre-move line and byte counts and the current handoff-packet validator result.

## Required review and verification

Issue 01 requires Architecture review for durability/recovery, Test Automation review for repeatable link/threshold checks, Design and UI/UX review for historical lookup, and PM confirmation that the intake/authority boundary remains unchanged. Only then may the Coordinator perform the first archive operation under issue 02.

After a migration, Test Automation independently verifies archive links, append-only preservation, threshold accounting, active-work retention, and that routine sweeps can be run from the live ledger alone. The current-root handoff-packet validator must exit `0` before any packet-dependent advancement or milestone closure.

## History predating this repository root

This repository's recorded history begins `2026-08-16`. Coordination work from `2026-08-13` to `2026-08-14` was committed on a separate line that shares no ancestor with `main`, preserved on the remote branch `main-local-snapshot` (tip `16a2bb9`).

That branch is provenance only and is authoritative for nothing. Because the two histories are unrelated, it cannot be merged and range syntax such as `main..main-local-snapshot` does not describe it; read it directly with `git log main-local-snapshot` or `git show main-local-snapshot:<path>`.

Its live ledger's coordination subjects are all represented in this directory or in the live ledger, verified `2026-08-17`. What that branch holds and this tree has never had is `23` Godot files under `scripts/` — the encounter resolver/snapshot seam, an action resolver, a player board, and five debug probes — which no commit here has ever contained.

One search caveat, because it bears on the reverse-dependency sweep above: archived blocks may collapse a numbered series into a range, such as `First-turn loadout 01–04`. Searching for a single member by exact subject (`First-turn loadout 03`) will not match it, so sweep on the series name as well as the exact subject.

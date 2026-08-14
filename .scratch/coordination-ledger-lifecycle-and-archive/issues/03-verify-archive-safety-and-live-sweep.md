# Verify Archive Safety and Live Sweep

Status: blocked
Owner: Test Automation
Blocked by: 02

## Outcome

Independently verify archive links, append-only preservation, threshold accounting, active-work retention, and that a routine coordinator sweep can determine current work from the live ledger alone.

## Canonical Sources

- `docs/artifacts/project-coordination.md`
- `docs/artifacts/coordination-history/`
- Archive contract from issue 01

## Acceptance

Return a focused reproducible check/report that every live archive link resolves, no archived row is active, live ledger stays within its intended operational scope, and no canonical domain contract was copied into history.

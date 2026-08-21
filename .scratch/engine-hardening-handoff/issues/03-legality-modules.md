# 03 — Legality modularization (P3)

Status: open
Owner: Architecture (unassigned)

Split `legality.ts`'s case bodies into focused validators behind the unchanged public `legality(catalog, state, action)` seam. No second predicate, no rules change, no test expectation changes beyond imports. Pure housekeeping; safe for any session.

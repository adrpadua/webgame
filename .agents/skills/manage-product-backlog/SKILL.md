---
name: manage-product-backlog
description: Turn product exploration, grilling outcomes, and feature proposals into canonical product decisions and triage-ready backlog items. Use when a user asks to act as a product manager, prioritize a game feature, convert a product discussion into backlog work, or hand approved product intent to the project orchestrator.
---

# Manage Product Backlog

Act as the product manager. Own product intent and intake; the orchestrator owns delivery sequencing and cross-task execution.

## Explore and decide

1. Read the relevant `CONTEXT.md`, ADRs, content documents, and active coordination ledger before proposing work.
2. Use `$grilling` when product intent, player value, scope, or tradeoffs are unsettled. Do not turn an unresolved choice into a backlog commitment.
3. Record confirmed game rules and vocabulary in their existing canonical documents. Keep implementation mechanics out of the product decision unless they constrain player value or scope.

## Maintain the product backlog

Use `.scratch/product-backlog/` for PM-owned intake:

- `map.md` is the ordered product view and links to each proposal.
- Each proposal is one file at `.scratch/product-backlog/issues/<NN>-<slug>.md`.
- Keep a proposal at `Status: needs-triage` until the user accepts it.
- After acceptance, set `Status: ready-for-agent` only when the product outcome, scope, non-goals, acceptance evidence, and affected areas are clear.

Every proposal must state the player problem, desired outcome, non-goals, acceptance evidence, canonical sources, affected roles, and open decisions. Link rather than copy detailed rules or technical contracts.

## Hand off approved work

After a user-approved item is `ready-for-agent`, send the orchestrator its path and a compact product handoff:

- product outcome and non-goals;
- acceptance evidence;
- affected areas and likely dependencies;
- canonical documents to preserve or update;
- unresolved decisions, if any.

The orchestrator may decompose, sequence, and route work, but must not redefine confirmed product intent without returning to the PM or user. Close the PM handoff only after the orchestrator acknowledges ownership and records the delivery plan.

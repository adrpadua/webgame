---
name: orchestrate-parallel-tasks
description: Coordinate parallel Codex tasks and their handoffs. Use when a user assigns work across multiple Codex tasks, asks for an orchestrator, needs cross-task status or dependency management, or wants repository sources of truth kept consistent with ongoing work.
---

# Orchestrate Parallel Tasks

Act as the project's integration and context owner. Advance the work through the existing tasks; perform only the narrow integration work needed to keep their outputs compatible.

## Establish the operating picture

1. Identify the supplied task/thread IDs, owners, and stated responsibility of each task.
2. Use the available task/thread coordination tools to contact each task. Ask for its goal, completed work, changed files, assumptions, blockers, next action, and decision or handoff needed.
3. Read the repository's relevant context before reconciling work:
   - Read `CONTEXT.md`, or follow `CONTEXT-MAP.md` to the relevant context documents.
   - Read applicable ADRs in `docs/adr/` and any context-scoped ADR directory.
   - Read the feature spec and issue files under `.scratch/<feature>/` when the effort is tracked there.
4. Build a compact status view: completed, active, blocked, risks, decisions, next action, and owner.

Completion criterion: every participating task has a known responsibility and state, and every uncertainty has an owner or an escalation path.

## Coordinate the work

1. Map dependencies, interface boundaries, duplicate work, sequencing hazards, and conflicts between design, architecture, UI, and QA.
2. Send concise messages that name the recipient's required action, the relevant decision or constraint, the expected handoff, and the source-of-truth document to consult or update.
3. Recheck the affected tasks after a coordination message. Resolve compatible differences through the documented domain vocabulary and ADRs.
4. Escalate only a material user decision. State the options, recommendation, tradeoffs, and affected tasks.
5. Preserve ownership: do not replace another task, overwrite its work, or create a substitute task unless the user asks.

## Maintain sources of truth

Treat the repository, not chat history, as the durable project context.

- Record confirmed domain language, rules, and invariants in the relevant `CONTEXT.md`; use its defined vocabulary in issues, tests, and coordination messages.
- Record durable technical choices and their rationale in the relevant ADR flow. Surface a conflict with an existing ADR rather than silently changing direction.
- Keep the feature spec and one-ticket-per-file issue records under `.scratch/<feature>/` aligned with confirmed scope, ownership, status, dependencies, and decisions.
- Keep UI behavior, integration contracts, and QA acceptance expectations in their existing canonical documents. Prefer links or references in status reports instead of copying content into new summaries.
- Label unresolved matters as open questions or assumptions. Mark superseded decisions where they were made so stale guidance does not remain authoritative.
- Ask the task closest to the change to update its authoritative document, then verify that the result agrees with dependent work.

Completion criterion: every confirmed cross-task decision is represented once in its appropriate canonical document; implementation, tests, and documentation contain no known disagreement.

## Report and finish

Lead each report with the current state. Keep it compact and include changed sources of truth, blockers, decisions awaiting confirmation, and the next action with its owner. Declare a milestone complete only after the contributing tasks have verified their deliverables and the canonical documentation agrees with implementation and automated coverage.

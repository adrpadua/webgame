# Verify Tutorial-Prompt Contracts

Status: resolved
Owner: Test Automation
Blocked by: none

## Outcome

Independently verify deterministic trigger/non-trigger behavior, one-at-a-time priority, show-once/dismissal/help-reopen policy, portrait visibility, accessibility, and no HUD-to-rules authority drift.

## Non-goals

No gameplay redesign, prompt-copy change to make tests pass, analytics expansion, or hands-on claim substitution.

## Required return

Return the mandatory packet with exact commands/results, any remaining gap, and whether the Playtesting activation gate is satisfied.

## Completion Evidence

Test Automation independently passed the projection and portrait presentation routes. The temporary read-only Playtester then passed the default non-headless newcomer flow: read the short Boss Timeline card, dismiss it without advancing play, find it in Help's text-first history, and use Review to restore its contextual card. See `docs/artifacts/handoff-packets/tutorial-prompts-playtester/`.

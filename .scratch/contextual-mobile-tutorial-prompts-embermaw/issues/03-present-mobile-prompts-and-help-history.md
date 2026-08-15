# Present Mobile Prompts and Help History

Status: resolved
Owner: UI/UX
Blocked by: none; Test Automation and Playtester PASS recorded

## Outcome

Present one dismissible non-blocking prompt at a time on the approved portrait surface. Preserve board/cards at `390x844`, provide accessible full text, and let Help/Rules reopen previously shown guidance according to the approved policy.

## Non-goals

No HUD gameplay inference, protected gesture unless specifically approved, rules change, combat log, target-pattern UI, or default-deck/encounter change.

## Required return

Return the mandatory packet with canonical UI/accessibility updates, focused visual/probe evidence, and the QA handoff.

## Completion evidence

UI/UX completed the presentation-only implementation in `docs/artifacts/handoff-packets/tutorial-prompts-portrait-history-ui/completion.json`. Test Automation independently passed one-at-a-time/dismiss/reopen behavior, accessible full text, `390x844` visibility, and the presentation-only engine boundary. The temporary Playtester then passed the default portrait card/dismiss/Help/Review flow. See `docs/artifacts/handoff-packets/tutorial-prompts-portrait-history-qa/` and `docs/artifacts/handoff-packets/tutorial-prompts-playtester/`.

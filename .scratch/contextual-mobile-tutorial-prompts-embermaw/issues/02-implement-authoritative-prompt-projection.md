# Implement Authoritative Prompt Projection

Status: resolved
Owner: Architecture
Blocked by: none; Test Automation PASS recorded in `docs/artifacts/handoff-packets/tutorial-prompts-authoritative-projection-qa/`

## Outcome

Implement the smallest reusable prompt model and `EncounterEngine`/projection seam. It must expose prompt identity, authoritative basis, priority, surface/anchor, show-once policy, dismissal/completion state, and full-text fallback without adding rules or allowing HUD inference.

## Non-goals

No tutorial UI layout, state-driven gameplay/action changes, generic analytics, encounter/deck changes, or prompt-exposure gameplay facts. Encounter Record capture, if needed, is presentation-only metadata.

## Required return

Return the mandatory packet with public contract, paths, documentation, focused deterministic evidence, and the UI/UX handoff.

## Closure evidence

Architecture's authoritative projection packet and Test Automation's independent packet both pass. The seven prompts, one-at-a-time priority, accessible full text, caller-owned presentation state, Whelp route-blocking, and legal Sweeping Blow facts are covered without rules or Encounter Record authority changes. See `docs/artifacts/handoff-packets/tutorial-prompts-authoritative-projection-architecture/` and `docs/artifacts/handoff-packets/tutorial-prompts-authoritative-projection-qa/`.

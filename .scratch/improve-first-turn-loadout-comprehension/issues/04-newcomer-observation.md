# Newcomer Observation

Status: blocked
Owner: UI/UX
Blocked by: the temporary Playtester found the default portrait `?` Help affordance absent from the Help-hidden non-headless capture; the primary newcomer flow passes, but secondary support is not discoverable

## Outcome

Commission one temporary read-only Playtester only after deterministic/UI evidence and the documented activation gate pass. Obtain a hands-on newcomer verdict that the first screen communicates load a card, then Play, without verbal coaching.

## Active Handoff

The temporary Playtester is configured with the closest available alternative to the requested medium-thinking configuration: `gpt-5.6-terra` at `medium` reasoning. Its authoritative assignment packet is `docs/artifacts/handoff-packets/pilot-03-first-loadout-playtester/assignment.json`; it returns its read-only verdict to the Coordinator, which records the packet evidence without treating Playtester as an implementation owner.

## Observation Result

The Playtester returned `PASS WITH CONCERNS`: the visible Hand → `CARD SLOT` / `DROP` → `Play` sequence and exact prompt satisfy the primary uncoached first-action claim. In `tmp/mobile-help-hidden.png`, however, the secondary `?` Help affordance was not visibly rendered even though the probe can open its pane programmatically. UI/UX must restore visible discoverability; Test Automation must add rendered-affordance evidence; Architecture and QA then recheck before a focused Playtester retest. See `docs/artifacts/handoff-packets/pilot-03-first-loadout-playtester/completion.json`.

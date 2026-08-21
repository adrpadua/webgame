# 05 — D-086: hex_entered, ground's first Reader

Status: delivered (Architecture + docs: this session)
Owner: User-routed follow-on; decided Adopted at user direction (D-086)

## Scope delivered

- Registry row `hex_entered`, raised once per hex a piece enters at the three movement sites (voluntary move, each traversal hex, each displacement hex), beside `hazardEntryActions` — engine Hazards unchanged.
- `host_entered` joins the authored `when` vocabulary as the one Reader a hex-hosted Counter may carry; the host/when pairing is a load error in both directions (ground refuses combatant whens, a combatant refuses `host_entered`, a slot refuses all readers), each naming the file.
- The raise generates one damage action per ground Counter (`per` × count, mark-named, sourced by nobody), and its matches append onto the moving action's `subscriber_matches` — the recorder now appends, since one traversal carries several raises.
- No authored content yet, per the D-071 vocabulary-first precedent; no team immunity on ground Counters — deliberately left to the first content that wants it (recorded in the D-086 row).

## Acceptance evidence

- Engine tests: a walker pays every marked hex it crosses (one damage action per Counter, matches appended in path order on one fact); a jumper pays only its landing; all three host/when refusals asserted by message.
- Sweep: 48 policies × 30 seeds vs the current-main baseline — 0 differences in any column (no content authors the vocabulary).
- Sealed duo Record replays with `finalStateMatches: true` and matching fingerprint.
- 575 tests green; `verify:local` green end to end; mutation audit **110/110 caught, 0 survived, 0 stale** — the new "ground's Counters never answer the footstep" mutant killed by the walker test.

## First consumer (D-091, PR #138)

Stake the Line / Staked Ground delivered as candidate content with the `aegis_staked_line` evaluation deck; the proving flushed and fixed the `fireTargeting` zero-burst hex gap. Clean full gate on the final content commit: 577 tests, `verify:local` green, mutation audit **110/110 caught, 0 survived, 0 stale**. (Two earlier gate runs discarded — they raced each other's mutation audits; the clean run is the recorded result.)

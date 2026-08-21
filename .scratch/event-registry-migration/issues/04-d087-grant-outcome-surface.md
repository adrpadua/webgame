# 04 — D-087: subscriber_matches becomes the Grant-outcome surface

Status: delivered (Architecture + consumers: this session)
Owner: Coordinator-routed follow-on of the registry delivery; decided as D-087 (Adopted)

## Scope delivered

- `GrantOutcome` and the registry's grant `subscriber_matches` entries carry `reason` (the gate that refused, `standing_clause`, `at_max`) and `charges` (the stack after the event, the `counter_event.count` convention).
- `readSubscriberMatches` in `events.ts` is the one paired reader; `signature_event` and `readSignatureEvent` are deleted, not kept alongside.
- The evaluation sweep's `sigGrant`/`sigWaste` columns read the new surface; the board's earn/waste floats read it too, and anchor at the **earning host** — a dealing-side earn floats at the Hero who landed the blow, which the old target-anchored float could not do.
- Grant evaluation, gates, and Charge banking untouched, per the row.

## Acceptance evidence

- **Sweep numeric identity**: full 48-policy 30-seed solo sweep before and after, all 48 rows × every column compared programmatically — 0 differences; `sigGrant`/`sigWaste` identical through the new reader.
- **Read-back tests**: the paired reader returns Maren's dealing-side earn with `reason`/`charges` off a damage fact, and `[]` for absent detail; the ordering tests now assert `reason`/`charges` on every grant entry, including the `slot_fired` earn — the assertions issue 02 could not write.
- **Board floats**: new test — a dealing-side earn floats at Maren's hex, not the Boss's; the existing wasted-earn float test passes unchanged through the new path.
- **Sealed-Record replay**: the Brand-trial duo Record sealed pre-change replays post-change with `finalStateMatches: true`, identical final-state fingerprint (`ace5c2f8…`), 0 final-state leaf diffs; fact-stream delta is exactly the decided shape — 8 `signature_event` removals (the retirement) and 16 enriched `subscriber_matches` entries. No content change; content fingerprint unchanged (`a615efa7…`), so no cohort restart.
- Suite: 555 tests green (553 + the two new acceptance tests); `verify:local` including the 103-mutant audit recorded on the delivery commit.

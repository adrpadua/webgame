# 02 — Ordering test and sealed-Record replay evidence

Status: delivered (Test Automation: this session; PR #130)
Owner: Test Automation

## Scope

1. The ordering test: stage two subscribers answering one event on the Elian + Maren duo (the Brand trial party), assert the exact stated sequence — not merely a stable one. This is the only artifact that makes the written rule enforceable; the fingerprint proves *an* order held, not *the stated* order.
2. Replay a sealed pre-migration Encounter Record (prefer the Brand trial duo Scenario) under the new dispatch path; record `finalStateMatches` and the fingerprint match as evidence.
3. Independently verify behavior preservation: both sweeps byte-identical against the pre-migration baseline except where the D-085 rename changes content identity — and there, confirm the delta is identity-only (fingerprint) with all measured columns unchanged.

## Evidence

Independent verification against ADR 0041's claims, not the implementation's comments: the implementer was a different session (issue 01, PR #128). Pre-migration baseline throughout is `0c86fe1` — `main~1` of merge commit `924e70c` — checked out as a worktree and run with the same dependency tree.

### 1. The ordering test (`web/src/engine/events.test.ts`, 5 tests, all green)

Staged on the real Elian + Maren duo (`embermaw_attrition_trial`); the observable is the `subscriber_matches` fact-detail entries, asserted with exact-order `toEqual`, never set membership.

- `answers one blow in the stated sequence: raise order, seat order, authored order within a host` — one blow (Maren → Elian, `tank_hit`) answered by three Readers and two Grants: all `damage_incoming` entries precede all `damage_resolved` entries (raise order); within each raise guardian (seat 0) precedes maren (seat 1); Elian's two Counters answer in the order they sit on him (sundered before seared). Also pins that the recorded deltas moved the number (`requested: 5` from amount 2 + 3).
- `orders hosts by Party seat, not by the raise naming the target first` — the discriminator: Elian (seat 0) strikes Maren (seat 1). The raise names hosts target-then-source; the assertion requires source-first, which only seat order produces.
- `orders Hero seats ahead of board-creation hosts` — same discriminator against the Boss as target: every Party seat answers before any board-entity host.
- `slot_fired hears the Grant before the Reader, and one host answers in authored index order` and `round_start hears the Reader before the Grant — the row decides, not the kind` — the registry row's declared `hears` order, asserted in both directions so the order is provably the row's declaration, not a global kind precedence. Hand-built catalog: no shipped duo content subscribes both kinds to one of these events (noted in the test).
- Mutation check (not committed): replacing `hostOrder`'s sort with raise-argument order fails exactly the two seat-order discriminator tests; registry restored byte-identical afterwards.

### 2. Sealed-Record replay under the new dispatch path

No pre-migration sealed record is committed, so one was produced at the baseline: the committed Brand-trial duo Scenario (`data/scenarios/brand_trial_duo_line.json`, byte-identical at both commits) folded through the *pre-migration* engine and sealed as a schema_version 2 Encounter Record via `web/scripts/sealRecord.ts` (committed with this issue, alongside `web/scripts/verifyReplay.ts`).

Baseline-sealed record (at `0c86fe1`): outcome `defeat`, end_kind `end_of_clock`, rounds_played 9, 172 recorded actions, content fingerprint `a84f4854d05c…`, final_state_fingerprint `ace5c2f82be1…`.

Replayed under the new dispatch path (`npx vite-node scripts/verifyReplay.ts -- <baseline-record>` at this commit):

- `finalStateMatches: true`, `fingerprintMatches: true` (replay fingerprint `ace5c2f82be1…` = recorded).
- Final-state structural diff: **0 leaf differences** — the new dispatch path lands the pre-migration fight on the byte-identical final state.
- Fact-stream structural diff: **8 leaf differences, all of them `detail.subscriber_matches` added** by ADR 0041's fact-detail recording (a raise with ≥1 match records who matched). No measured value — `health_loss`, `requested`, `prevented`, rounds, outcomes — differs anywhere in 172 actions.

Self-consistency at this commit: the same Scenario sealed and replayed entirely under the new path gives `finalStateMatches: true`, `fingerprintMatches: true`, 0/0 diffs. Its content fingerprint is `a615efa7fb0f…` ≠ baseline `a84f4854d05c…` — the D-085 rename's identity-only cohort restart — while the final-state fingerprint is identical across the migration.

### 3. Behavior preservation: both sweeps against the baseline

Both sweeps run at `0c86fe1` and at this commit, same seeds, same dependency tree:

- `evaluate.ts` (48 policy variants × 30 seeds, solo default encounter, exercises the renamed Sundered via the Riposte rider): JSON aggregates **byte-identical**; stdout identical except the output-file path chosen for each run. Every measured column — checkpoint%, hpDeath%, enrage%, avgRound, escalation, sigGrant/sigWaste/sigFull/sigEarly, sundered, bossDmg, all of them — unchanged.
- `attritionLine.ts` (30 seeds, solo + duo arms, exercises the renamed Seared and Maren's whole loop): stdout **byte-identical** (solo 0/30 clears, duo 0/30 clears, all averages unchanged).

Neither sweep prints a content fingerprint, so the only observed migration delta anywhere is the content-identity fingerprint in §2 — exactly the identity-only delta D-085 accepts, with every measured column unchanged.

### 4. Validation gate

- `npm test`: **553 passed** (548 at issue-01 delivery + the 5 new ordering tests), 0 failed.
- `npm run verify:local` (with `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`): green end to end — see the return packet below for the exact tail.

## Flagged oddity: the dealing-side `signature_event` never reaches the fact stream

Examined and reported, per the issue-01 flag; nothing fixed.

**Confirmed real, and confirmed pre-existing.** At the baseline, `evaluateStandingGrants` (old `signature.ts:170-175`) already evaluated the dealing-side Grant against `{ ...resolutionFact, effect_landed: … }` — a copy — so `evaluateGrantsFor`'s `record.signature_event = …` write landed on an object nothing retained; the old `slot_fired` call site (old `resolve.ts:386-395`) passed the same kind of detached copy. The migration reproduces both exactly (`events.ts` `raiseDamageResolved`, `raiseSlotFired`). Only the takes-side Grant (`host_takes_damage`, evaluated against the real `resolutionFact`) gets its `signature_event` onto the stream. The Charge mutation (`slot.earnedCharges`) is what survives on the other paths.

**Who reads the lost events today:**

- `web/scripts/evaluate.ts` (the sweep's `sigGrant`/`sigWaste` columns) reads `signature_event` off damage facts via `readSignatureEvent`. The default sweep is the solo encounter, whose only Signature is the Riposte (takes-side), so the columns are currently *accurate* — but pointed at any dealing-side or `slot_fired` Signature they would silently read 0.00: the dead-instrument-mistaken-for-null-result failure this codebase repeatedly documents.
- `web/src/board/effects.ts:209` (presentation) floats "+1 <Signature>" / "<Signature> wasted" off `resolutionFact.signature_event`. This is a **live gap in the shipped duo**: Maren's Underwriting earn (`host_deals_damage`) never floats, and neither would any `slot_fired` earn — including a *wasted* earn, which D-064 says "has to be visible to the player and the cohort alike, never silently absorbed". For two of the four Grant moments, it is silently absorbed.
- Tests: `engine.test.ts` asserts `signature_event` only for the Riposte (the surviving takes-side path); `attrition.test.ts` proves Maren's earn by asserting `earnedCharges` state directly, so no committed test reads the lost events. Nothing is broken today; nothing would fail if the loss deepened, either.
- `attritionLine.ts` does not read `signature_event` at all.

**Mitigating fact from this migration:** ADR 0041's `subscriber_matches` fact detail now records every Grant outcome on every raise — including `wasted`/`not_granted` on the dealing side and `slot_fired` — so the *outcome* does reach the record post-migration, though without the `reason`/`charges` payload, and neither `evaluate.ts` nor `effects.ts` reads it.

**Recommendation (not implemented): yes, this should become a D-row.** It is designer-facing visibility vocabulary, not an engine detail: D-064's "a wasted earn is never silently absorbed" is currently true for one Grant moment and false for the other two that have shipped content (Maren) or a registry row (`slot_fired`). The decision the row should make: either `signature_event` rides the real resolution fact for every stance (accepting a record-shape change and a fingerprint-visible fact for the dealing side), or `subscriber_matches` becomes the canonical reader surface — extended to carry `reason` and `charges` — and `evaluate.ts` + `effects.ts` migrate onto it. Both are behavior-visible enough to deserve their own decision rather than riding a migration that promised to preserve behavior.

## Return packet

```text
State: completed
Outcome / non-goal compliance: Ordering test staged on the Elian + Maren duo asserting the exact
  stated sequence (5 tests, green; seat-order mutants killed); baseline-sealed Brand-trial duo
  Record replays under the new dispatch path with finalStateMatches true, fingerprint match, and
  0 final-state diffs; both sweeps byte-identical against 0c86fe1 with the content fingerprint
  (a84f4854… → a615efa7…) the only migration delta. Nothing fixed outside scope: the flagged
  signature_event fact loss is reported with a D-row recommendation, not patched.
Changed paths and canonical docs updated: web/src/engine/events.test.ts (new),
  web/scripts/sealRecord.ts (new), web/scripts/verifyReplay.ts (new), this issue file. No
  canonical doc changed; the D-row recommendation above awaits a Design decision.
Validation command(s) and exact result: cd web && npm test → 553 passed, 0 failed.
  PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run verify:local → green end to end
  (log:ids, tests, lint, build, browser smoke, mutation audit 103/103 caught, 0 survived, 0 stale).
  Replay evidence: npx vite-node scripts/sealRecord.ts at 0c86fe1, npx vite-node
  scripts/verifyReplay.ts at this commit; sweep diffs via scripts/evaluate.ts --seeds 30 and
  scripts/attritionLine.ts at both commits.
Dependencies / risks / decision needed: One decision for Design/PM routing — whether the
  dealing-side/slot_fired signature_event fact loss becomes a D-row (recommended yes; see the
  flagged-oddity section). No blocker for closing this issue or issue 03.
Required next owner and requested action: Orchestrator — record closure, merge the PR, and route
  the D-row recommendation to Game Design.
```

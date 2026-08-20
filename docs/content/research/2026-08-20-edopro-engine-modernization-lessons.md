# Research: What EDOPro's Decade of Maintenance Says About This Engine's Next Two Seams

Date: 2026-08-20
Method: First-party source reading of three shallow clones — `edo9300/edopro` (the client), `edo9300/ygopro-core` (its rewritten rules core, ~34,400 lines of C++), and `ProjectIgnis/CardScripts` (the script library it ships with, ~22,650 card scripts). This is the actively maintained successor lineage of `Fluorohydride/ygopro`, whose original core informed [ADR 0041](../../adr/0041-dispatch-every-triggered-effect-from-one-event-registry.md). All claims below are read directly from the code and are **high confidence**; nothing rests on secondary sources.
Scope: Which of EDOPro's modernizations — the changes a decade of maintaining the same architecture actually forced — are worth adapting here, and which are ruled out.

## The licensing wall, stated first

**Every repository in this lineage is AGPL-3.0-or-later** — the core, the client, and the card scripts alike. The original Fluorohydride core was MIT; its successor is not. For a web-served game, copying even one Lua helper or C++ struct would trigger AGPL's network clause for the whole application. Everything below is therefore an idea source and nothing else: shapes yes, code never. (ADR 0041 already took nothing but the multimap idea from the MIT-licensed ancestor; this note holds that line where the license makes it mandatory.)

## Executive Summary

EDOPro is the strongest available precedent for the trajectory ADR 0041 put this engine on, because it is the *same architecture we borrowed the registry shape from, ten years later*. Its maintainers were forced into two further moves, in order: they **typed the dispatch** (the untyped processor stack became 82 typed step structs in a `std::variant`), and they made **"awaiting player input" a structural property of a resolution step** rather than a control-flow accident. Those are precisely the two rungs above the registry on this repo's ladder, and the second one is the "resumable resolution" seam ADR 0041 explicitly deferred. When that ADR gets written, it should be written against EDOPro's shape.

The script library contributes a different lesson: 22,650 cards survived on a **stratified authoring ladder** (raw engine API → shared helpers → parameterized procedure files → thin per-card scripts) and on `MODERNIZING.md`, a living catalog of authoring idioms that aged badly and what replaced them. The ladder validates this repo's own (engine code → registry rows → schema fields → authored JSON); the migration catalog is an artifact this repo does not have yet and will want.

One confirmation rather than a find: EDOPro replays are a seed plus a response stream folded through the deterministic core — structurally identical to this repo's `schema_version: 2` Encounter Records. Two engines converging independently on that design is good evidence for it.

## Findings

### 1. The typed resolution stack (`processor_unit.h`) — the reference shape for resumable resolution

The ancestor core's processor was a stack of untyped units: a `type` tag, a `step` counter, four integer args, four `void*` pointers. EDOPro rewrote it as **82 typed step structs in a `std::variant`**, each inheriting from `Process<needs_answer>` so that *whether a step blocks on a player response is a compile-time property of the step's type*:

- `Adjust`, `Turn`, `RefreshLoc`, `Startup` are `Process<false>` — they run through.
- `SelectCard`, `SelectYesNo`, `SelectOption`, `SelectBattleCmd`, `SelectUnselectCard` are `Process<true>` — they suspend.

One `std::visit` loop (`processor_visit.cpp`) runs steps until it reaches a `needs_answer` step, returns `OCG_DUEL_STATUS_AWAITING`, and the host later supplies a typed response via `OCG_DuelSetResponse` before calling `OCG_DuelProcess` again. Resolution state between suspensions lives *in the step struct's own fields*, not in globals.

The mapping onto this engine is direct, because half the shape is already here: `EncounterActionInput` is already a discriminated union, and `resolve` is already a pure fold. The missing half is the suspension: today every player decision is made *before* an action is submitted (the action carries its target), so nothing mid-resolution can ask a question. The Healer era is where that assumption gets tested — a rescue choice inside a Beat, a reaction window, an ally pick that depends on state only visible mid-resolution. When it breaks, the EDOPro shape is: resolution steps as a typed union; "blocks on input" a property of the step type; `resolve` returning `{ status: 'awaiting', question }` with typed question payloads; resumption by feeding the answer back into the fold. That keeps deterministic replay intact — the Record simply carries the response stream, which is finding 4.

ADR 0041 deliberately declined to be an increment toward this. That remains right; this note is the design research for the *separate* future ADR, filed before the need arrives.

### 2. Incremental questions, not enumerated actions

The core never enumerates every legal composite action. It asks small typed questions in sequence — pick a card, then a zone, then confirm — each validated as it arrives. This repo's `legalActions` and `fireTargeting` instead enumerate the full cross-product of legal actions up front, and at today's scale that is correct and simpler. But the cost grows multiplicatively with the Party: ally targets × hexes × slots × charge choices. The two models are not rivals — the question stream is what finding 1's suspension mechanism produces for free, so adopting resumable resolution *is* adopting incremental questions where they are needed, while `legalActions` stays the right tool for flat cases like Loadout.

### 3. The authoring ladder and `MODERNIZING.md`

CardScripts is stratified into four rungs: the raw engine API; `Auxiliary` shared helpers (`utility.lua`); **procedure files** (`proc_synchro.lua`, `proc_persistent.lua`, …) — parameterized bundles that register a whole effect complex from one call; and thin per-card scripts on top. The volume that forced the stratification (22,650 scripts) is the strongest available evidence that a layered vocabulary is what absorbs content scale without per-content engine changes.

This repo's ladder is the same shape — engine code → registry rows → schema fields → authored JSON — so the finding mostly validates existing decisions (ADR 0020, D-047's reader vocabulary, ADR 0041's registry). The one artifact worth adopting outright is **`MODERNIZING.md`**: a living, examples-first catalog of authoring idioms that aged badly and their replacements ("use the constants, not hardcoded values"; "every activated effect gets its own description, because bots and tools read them"; "remove this flag, the core handles it now"). The design-decision log records *decisions*; nothing here records *idioms to migrate away from*. When `data/` reaches a few dozen cards across three Heroes, a `docs/content/authoring-modernization.md` earns its place — and the description-per-effect rule, adopted so machine readers can tell effects apart, is the same philosophy as this repo's fact-stream discipline arriving from the opposite direction.

### 4. Replay convergence, and the RNG that is worth noting but not taking

EDOPro replays are the seed plus the ordered player responses, re-folded through the deterministic core. That is structurally this repo's Encounter Record (seed + submitted actions + fingerprint), reached independently — a confirmation that strengthens confidence in ADR 0019's record design rather than changing it. It also means finding 1 composes with the Record: a suspension's answers are just more entries in the replayed stream.

EDOPro also replaced its RNG with **xoshiro256\*\*** (`RNG/Xoshiro256.hpp`), statistically stronger than this repo's 32-bit mulberry32. The algorithm's reference implementation (Blackman/Vigna, prng.di.unimi.it) is public domain, so *that* adoption path — from the original, not from EDOPro's AGPL wrapper — is license-clean. Ruled out anyway for now: ADR 0012/0019 declare numeric parity a non-goal, mulberry32's quality is adequate for seeded-replay purposes at this scale, and a PRNG swap invalidates every baseline and sealed Record. If it ever happens, it belongs at a clean cohort boundary, the way the registry landing was chosen as one.

## What this note does not recommend

No change to ADR 0041 — EDOPro is precedent *for* it, not pressure on it. No resumable-resolution work now; the seam waits for the first mechanic that cannot phrase its player choice as a pre-targeted action. No RNG migration. And no code from any repository in this lineage, ever, per the licensing wall above.

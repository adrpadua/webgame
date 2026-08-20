# Dispatch every triggered effect from one event registry

Every triggered effect in the rules — a Counter Reader, a Signature Grant, and whatever subscribes next — is dispatched from one event registry. Resolution code raises a named event where the rule resolves; the registry decides who hears it. The event vocabulary becomes one table naming, per event, what the event carries, which effects may be summed off it, and which gates may be asked of it. `READABLE_READER_PAIRS` in `counters.ts` and the `EVALUATED_GRANT_WHENS`/`GATES_BY_WHEN` pair in `signature.ts` collapse into that table, and the two `when` enums in `schemas.ts` become one.

No fight changes. No trigger moment is added that the engine does not already resolve, and the Resolution Fact stream keeps its current shape. What does change is one authored word: `host_takes_damage` currently names two different moments, so it splits, and the two shipped files that use it land on opposite sides of the split. That rename is the point rather than a side effect of it.

## The two guards are the same guard

`counters.ts` explains why its guard list exists: the Reader schema's two enums "multiply out to sixteen combinations and `readerSum` is called with four of them, so the other twelve validate cleanly and do nothing — which is exactly the `on_enter_hex` trap D-047 was written to close, re-created one level up." `signature.ts` explains why *its* guard list exists in almost the same sentence, and calls itself a mirror of the first.

That is the finding. The trap has now been closed twice, in two files, with two hand-maintained tables, because the cause was never removed: a `when` is a string an author writes, and whether the rules read it is decided somewhere else entirely — at a call site in `resolve.ts` that no schema, no table, and no type knows about. The guards are lint for a structural gap. They work, and they will keep needing to be written.

The duplication is not one line; it runs the length of the path. The same four strings are enumerated twice in `schemas.ts` (`counterReaderSchema.when`, `signatureGrantSchema.when`). They are enumerated a third and fourth time as guard tables. `catalog.ts` validates authored content against those tables in two separate branches. Dispatch runs through two unrelated mechanisms — `readerSum` at four call sites, `evaluateGrantsFor` at four more. And `engine.test.ts` holds one of the two lists in agreement with its schema enum by assertion, which is the tell: agreement that has to be tested is agreement that is not structural.

A blow shows what that costs, and shows that the vocabulary is lying. A Counter's `host_takes_damage` Reader is read inside `applyDamage`, off live state, *before* mitigation — it has to be, because it changes the number. A Signature's `host_takes_damage` Grant is read by `evaluateStandingGrants` in `signature.ts`, off the resolution fact dictionary, *after* the blow has fully landed — it has to be, because `health_loss_zero` is a question about the outcome. Those are two different moments in the damage step, and they are correct as two different moments. But they share one `when` value, one schema enum entry, and one name in the designer's head, and nothing anywhere says they are not the same event. An author reading the enum has no way to learn that their Reader fires upstream of mitigation and their Grant fires downstream of it.

This is not hypothetical, and it is not a corner. Both are shipped: `data/counters/sundered.json` reads `host_takes_damage` as a modifier, and `data/cards/elian_riposte.json` reads `host_takes_damage` as a reaction. The Warden's whole identity and the game's only damage-amplification Counter are authored against the same string, meaning two different things, and the vocabulary cannot tell them apart.

Teaching the rules one new event today means six edits across four files. Two of them are the ones that make the event real, and they are exactly the two no schema can check. Adding a third subscriber kind means writing the guard a third time.

There is also a trigger already outside the vocabulary entirely. Hazard entry damage is generated directly by `hazardEntryActions`, hardcoded at the three movement sites that call it — voluntary movement, traversal, and displacement — answering to no `when` at all. And `on_enter_hex` is precisely the pair D-047 deleted from the Reader enum rather than teach the rules to read. That is the third shape the same problem takes: a moment the engine resolves that content has no way to name. It is not fixed here, but it is the clearest measure of what a registry is for — under one, "should content be able to read this moment?" is a row, and today it is a rewrite.

## What the registry is

One table, keyed by event id. Each row names the event's payload — the keys a subscriber may read, which is what makes `event_keyword` narrowing and gate evaluation checkable rather than conventional — the effects that may be summed off it, and the gates it can answer. That is the union of what the two guard tables say today, minus the duplication, and it is the single place a new event is declared.

Resolution code raises each event once, at one stated moment, carrying one payload — and the table is where a moment gets a name. The damage step raises two: one before mitigation, carrying the blow's Keywords and its proposed number, whose subscribers may change that number; one after it lands, carrying health loss and Guarded Front state, whose subscribers may only react. That is what the code already does; the table is what makes it sayable. A modifier and a reaction stop sharing a `when`, an author can see which one they are writing, and "may this subscriber change the number?" becomes a property of the event rather than of which function happened to call it.

Subscribers register by content load rather than by call site, so a Counter Reader and a Signature Grant reach a new event the moment its row exists.

The authoring guard survives and gets stronger: an authored `when`/`effect`/`gate` triple is checked against the one table, so "you authored something nothing reads" stays a load error naming the card — the discipline D-047, D-064, and ADR 0037 each paid for separately, now paid for once.

## Ordering becomes a rule

Subscriber order is currently incidental. It comes out of object insertion order in `draft.counters` and `Object.keys(draft.heroes)`, which is stable in practice — insertion order survives `structuredClone`, and a Record replay re-runs setup from the seed — but it is stable by accident of the host language rather than by a rule anyone wrote down. With one Hero and one Counter host it has never mattered.

It will. A Party takes a Boss Beat together (ADR 0035), and the Round several Heroes hold Counters that answer the same blow is the Round the order of payouts decides who lives. Since a sealed Encounter Record replays to a state fingerprint, an order nobody stated is an order nobody can defend when a replay diverges.

So the registry states it: subscribers fire in raise order, then by host ref sort order, then by authored index within a host. Deterministic by rule, not by runtime.

## What this is not

It is not a chain, a priority stack, or a response window. Nothing here lets a subscriber interrupt, negate, or reorder another, and nothing here pauses resolution for a player choice — an event raise resolves to generated actions on the existing depth-first funnel, exactly as `slotFiredCounterActions` does now. Resumable resolution is a separate and larger question about the `resolve` seam, and this ADR is deliberately not an increment toward it.

It is not a scripting layer, and it does not reopen the boundary `cardReaderSchema` draws: gates still AND, there is still no `or`, and a mechanic wanting boolean logic still belongs in engine code. A registry changes where a subscription is declared. It does not change what a subscription may say.

It adds no trigger moment the engine does not already resolve. Splitting `host_takes_damage` in two is a rename of moments that both already exist and already fire in that order; the modifier still runs before mitigation and the reaction still reads the outcome. The container ships with its existing consumers, which is D-064's precedent and ADR 0037's: the first content to need a genuinely new event will be the first to prove the shape.

## Rejected alternatives

**Keep adding call sites.** The status quo works and every individual increment is small. That is what makes it worth deciding against explicitly: the cost is not in any one increment, it is that the guard has now been written twice and the third subscriber writes it a third time. The trap the guards catch is one an author hits and a reviewer cannot see.

**Dispatch off the Resolution Fact stream.** Tempting, because the fact stream is already an ordered record of everything that resolved, and it is the right shape at a glance. It is the wrong contract. Facts are the presentation and record surface — `RecordedAction`, `schema_version: 2`, replayed and fingerprinted — and welding rules dispatch to them makes every record-shape change a rules change and every rules-visible event a permanent record field. Raise events explicitly alongside facts and keep the two free to differ.

**Copy ocgcore's effect table directly.** The registry's shape is borrowed from `ocgcore`, the rules core behind `Fluorohydride/ygopro`, where `field.effects` is a multimap keyed by event code and resolution raises events the dispatcher matches. That engine has absorbed roughly twelve thousand cards without a per-card engine change, which is the strongest available evidence that the shape holds at scale. What is not borrowed is its typing: effect codes there are a flat global integer namespace with no schema and no validation, so an effect subscribing to nothing is silent rather than a load error — the exact failure both guard tables here exist to prevent. The payload-and-gate table above is what keeps that guard while taking the dispatch shape. Nothing is copied but the idea; no code crosses over.

## Cost

One indirection appears between the moment a rule resolves and the moment an effect lands, and reading `resolve.ts` no longer tells you everything that happens at a damage step. That is the real price, and it is the same price every dispatch table charges. The mitigation is that the raise is recorded in the raising action's fact detail — which subscribers matched, and what each contributed — so the fact log answers "what fired and why" without reading the table.

Migration is mechanical and behavior-preserving: one table; eight dispatch call sites (`readerSum` ×4, `evaluateGrantsFor` ×4) converted to raise sites; two schema enums merged; two catalog branches merged; two authored files renaming a `when` to the moment they always meant. The existing engine tests are the acceptance criterion and none of them should need editing — `engine.test.ts`'s enum-agreement assertion is the exception, and it is deleted rather than updated, because a merged enum is the agreement it was standing in for.

Hazard entry is the obvious first follow-on and is deliberately not in scope here: converting `hazardEntryActions` into an `on_enter_hex` subscription is a rules-visible change — it would let a Counter or a Grant read a moment that today only the engine can — and it should be decided as content vocabulary, on its own, once the registry it would subscribe to exists.

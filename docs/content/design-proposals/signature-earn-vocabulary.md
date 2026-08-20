# Engineering Request: The Signature earn vocabulary is Warden-only

Date: 2026-08-19
Status: **Shipped 2026-08-20** as D-071 / [ADR 0037](../../adr/0037-widen-the-signature-earn-vocabulary.md). All four `when` values are evaluated, gates are paired to the event they can answer, and `effect_landed` is the first non-tank gate. The request text below is kept as the record of what was asked for and why.
Context: [D-064 / ADR 0032](../../adr/0032-give-each-hero-a-fixed-signature-slot-with-earned-charges.md), [Character Design Bible](../../rules/character-design-bible.md), [Kessa Varn design](../heroes/kessa-varn-design.md) (D-014), [design-team handoff](../design-team-handoff.md).

## The finding

A Signature's standing clause can only fire on **one** event: the Hero taking damage. Three of the four `when` values the schema accepts are refused at load, and the refusal names the reason:

```
Card probe_sig (data/cards/probe_sig.json) authors a host_deals_damage standing clause,
which nothing evaluates; the evaluated whens are host_takes_damage
```

The same holds for `slot_fired` and `round_start`. The gate list is the second half of the same shape: `health_loss_zero` is a perfect block and `guarded_front` is the Warden sentence as a predicate. Both are tank concepts, and both only mean anything on an event that is already "I was hit".

So the authorable Signature space today is exactly one sentence: **"when I take damage, optionally having blocked it perfectly and/or while holding the Guarded Front, gain a Charge."**

## Why this blocks the Hero-authoring promise

D-064's third settled decision is that **everything about a Signature is authorable in `data/`** — "a Hero's engine is a game component. No part of a Signature stays in TypeScript." That promise holds for Elian and for any future Warden. It does not hold for anyone else.

The Character Design Bible makes the Signature the place a Hero's machine pays off, and the **Second Hero Of A Role** rule makes it the place two Heroes of one role must differ. Both rules point at the one field that cannot yet vary:

- A damage Hero whose engine earns by **dealing** damage cannot author it.
- A Hero whose engine earns by **firing a Slot** — the tempo shape — cannot author it.
- A Hero who accrues on a **clock** cannot author it.
- Kessa Varn's Momentum earns on completed movement and on `slot_fired`-shaped play; her design doc already lists this among the seams that must land before any of her content is authored, and forbids a degraded proxy deck.

A designer can author a whole new Hero today — identity, health, deck, Keywords, Counters, Charge Modifiers — and then discover at the last step that the Hero's defining power can only be a Warden's. That is the wrong place to find out.

## Why the ask is small

The three unread events **already resolve in the engine**, and Counter Readers already read all four of them (`READABLE_READER_PAIRS` in `counters.ts`). Their live resolution points:

| Event | Where it already resolves | Counter Readers read it as |
| --- | --- | --- |
| `round_start` | `resolve.ts:530` | `armor` |
| `slot_fired` | `resolve.ts:766` | `boss_damage` |
| `host_deals_damage` | `resolve.ts:853` | `target_damage` |
| `host_takes_damage` | `resolve.ts:854` | `target_damage` |

The Signature's standing clause is deliberately the mirror of a Counter Reader — same `when` set, same `event_keyword` narrowing (D-049) — but it subscribes to one event where the Reader subscribes to four. The asymmetry looks like an unfinished increment rather than a designed limit: D-064 shipped the earn Elian needed and stopped, correctly, at its one consumer.

## Requested scope

1. **Evaluate the remaining three Grant `when`s** — `host_deals_damage`, `slot_fired`, `round_start` — at the resolution points above, adding each to `EVALUATED_GRANT_WHENS` only as it is genuinely read, so the existing load error stays honest.
2. **One non-tank gate**, to prove the gate list can hold a non-Warden predicate. Design does not need a specific one first; the smallest useful candidate is a gate that means "this fire actually did something" so a `slot_fired` earn cannot be farmed by firing into nothing.

Both keep the existing grammar exactly: gates AND, no boolean combination, closed enumerated sets. Nothing here asks for an interpreter.

## Non-goals

- **Not** Momentum. Kessa's resource is its own seam (a counted Hero resource with decay and printed activation costs) and is not requested here. This request is the narrower one underneath it: whatever a Hero's resource turns out to be, its Signature must be able to name the event that earns it.
- **Not** new gates on demand. Two events plus one proof-of-shape gate; further gates arrive with the Heroes that need them, the way Beat kinds do.
- **Not** a change to how Charges are spent, banked, or capped. The activation half of the Signature is fine.
- **Not** the multi-Hero party model, rear-arc targeting, or Breach.

## Player value

The player-visible outcome is that a second Hero can feel like a different job rather than a re-skinned Warden. Today every Signature the game can print rewards *being hit well*, which is one fantasy; a roster built on it converges on the pattern the Second Hero Of A Role rule exists to prevent.

## Acceptance evidence

- A Signature authored on each newly evaluated `when` earns a Charge in a focused Vitest case at the matching resolution point, and the fact stream records the earn and the non-earn with its reason, as `host_takes_damage` already does.
- The load error still fires for any `when` that remains unread — the guard must not be loosened wholesale.
- The mutation audit gains an entry per newly evaluated event, so a silently-stopped earn is caught rather than decorated.
- Elian's cohort numbers are unchanged: this adds vocabulary and must not move the Warden line. Re-run the sweep and compare within the fingerprint.

## Until it lands

The [new-Hero walkthrough](../authoring-a-new-hero.md) tells designers to check this constraint at step 0 rather than at step 5, and a Hero whose earn condition is not "takes damage" should be authored **without a Signature** (`signature_card: ""`, or the Encounter's `fields_signature: false`) rather than with a borrowed Warden gate that misstates their job. A Hero's deck, Counters, and Charge Modifiers remain fully authorable in the meantime — Counter Readers reach all four events, so the *machine* can react to dealing damage or firing a Slot even while the *Signature* cannot.

# Widen the Signature earn vocabulary to every evaluated event

Decision: D-071.

A Signature's standing clause may now fire on any of the four `when` values the schema accepts — `host_takes_damage`, `host_deals_damage`, `slot_fired`, `round_start` — rather than on the first alone. Which gates each event may carry is a closed pairing checked at load: `host_takes_damage` takes `health_loss_zero` and `guarded_front`, the two blow-shaped questions it always had; `host_deals_damage` and `slot_fired` take the new `effect_landed`; `round_start` takes none.

## Why

D-064's third settled decision promised a Signature **fully authorable in `data/`** — "a Hero's engine is a game component. No part of a Signature stays in TypeScript." That promise held for a Warden and for nobody else. Only `host_takes_damage` was evaluated, and both gates are tank concepts that only mean anything on an event that is already "I was hit", so the only Signature the game could print was *"when I take damage, optionally having blocked it perfectly and/or while holding the Guarded Front, gain a Charge."* A designer could author everything about a new Hero and discover at the last step that the Hero's defining power could only be a Warden's.

The asymmetry was an unfinished increment rather than a designed limit. All four events already resolved in the engine, and Counter Readers — the Grant's deliberate mirror, sharing its `when` set and its `event_keyword` narrowing (D-049) — already read all four. The Signature subscribed to one where its mirror subscribed to four.

## What `effect_landed` is for

A `slot_fired` or `host_deals_damage` earn with no gate is farmable: fire an empty Slot at nothing, or throw a zero-damage blow, and bank a Charge for it. That turns the earn into a formality rather than a reward for correct play — the Kardia failure the healer research note names, where a damage-to-healing link becomes passive wallpaper. `effect_landed` asks whether the event actually did something: a blow that cost the target health, or a fire that produced damage, Armor, healing, banked Armor, or a Counter.

It is also the first gate in the list that is not a tank concept, which was the second half of the request: proving the gate list can hold a non-Warden predicate rather than only growing Warden ones.

## The pairing check

A gate is a question about a moment, and three of these four moments are not blows. Asking whether a Round start lost zero health is not a hard question, it is an incoherent one. Rather than let such a Grant load and silently never fire, the catalog refuses the pairing by name — the same discipline `EVALUATED_GRANT_WHENS` already applies one level up, and the same reasoning behind `READABLE_READER_PAIRS` in `counters.ts`. `event_keyword` is refused on the two events that carry no damage Keywords for the same reason.

## What this does not change

Nothing about how Charges are spent, banked, or capped: the activation half of the Signature was never the problem. Elian's *Riposte* is untouched — it still earns on `host_takes_damage` gated on `health_loss_zero` and `guarded_front`, and its cohort numbers are unchanged, which is the point. This adds vocabulary; it does not move the Warden line.

No Hero authors a new earn yet. The container ships with its existing consumer, and the first Hero to use one will be the first to prove the shape — which is D-064's own precedent, and why this ADR is deliberately narrower than the Momentum resource Kessa Varn needs. Whatever a Hero's class resource turns out to be, its Signature first has to be able to name the event that earns it.

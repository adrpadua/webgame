# Traverse as a clause on any Boss Beat, on the Instant Row only

A Boss Beat may carry a **Movement Clause**: `move_tiles`, `traversal`, and the `range_tiles` it is closing to. The clause resolves before the Beat's own effect, so one Beat can be "move two hexes, then claw", and the claw is measured from where the movement ended. Movement is a **Traversal** — a route decided before the piece sets off — carried on its own `traverse_piece` action as the hexes entered in order, and it is legal on the `Instant Row` alone.

## Why a clause rather than a Beat kind

This repo's convention is one Beat kind per mechanic, and `advance_toward_player` already existed. The convention is right when a mechanic is a thing a Boss does; it is wrong when the mechanic is a thing a Boss does *before* something else. Expressed as two Beats, "close and strike" is a Program-ordering fact: the row happens to list the advance before the claw, nothing enforces it, and the pair reads as two threats where the player faces one. Expressed as a clause it is one Beat, one telegraph, one line on the printed card — the shape a Gloomhaven monster card has, and the shape that composes when the next Boss wants to leap and breathe.

The cost is that `move_tiles` is now readable on every Beat kind rather than one, so every kind can be authored wrong in a new way. That is paid for in the catalog: a Beat carrying a clause must author the distance it closes to, a `teleport` must not author an allowance it never spends, and a Beat that does not move must not author how it would.

## Why a Traversal is not a displacement

Push and Pull already move pieces (ADR 0029) and it was tempting to reuse them — the retired `advance` verb was exactly that, `pull`'s geometry wearing a Boss's name. It re-aims every hex and stops dead against whatever it meets, which is correct for a shove and wrong for a creature crossing a room: a Whelp of Embermaw's own summoning could pin Embermaw in place. A route decided in advance goes around instead. The split also keeps the Hazard bill honest, because the route *is* the bill — a walker pays for every hex it crosses, a jumper only for the hex it lands on, and that difference is not expressible as a distance and a direction.

Both rules still meet at the ground: a displacement respects `impassable`, because impassable must not mean impassable unless pushed.

## Why the Instant Row only

The `Incoming Row` is telegraphed a phase before it resolves, and where a moving Beat ends up is not knowable then — the Hero moves in between. A painted cone drawn from a projected destination is a promise the player breaks by playing correctly, which is the defect ADR 0031 removed the `Forecast Row` over: disclosure nobody can rely on teaches nothing and is worse than none. The `Instant Row` resolves immediately and promises nothing, so movement lives there and the catalog refuses it anywhere else.

This is a real restriction, not a temporary one, and it has an honest escape: a Boss that wants a moving telegraphed Beat should move the piece at *telegraph* time, so the cone is drawn from where it will actually stand. That is a design worth building when a Boss needs it, and it should arrive with that Boss rather than being left quietly available and wrong.

## Status

Accepted. The vocabulary ships ahead of content that uses it: Embermaw walks one hex across ground authored to block nothing, so `jump`, `teleport` and `impassable` are proven by tests and by catalog variants rather than by the evaluation sweep. Promoting any of them into a live Encounter owes a measured cohort — the three standing gates, plus the one this design is specifically at risk of failing: against a traversing Boss, the `far` policy must not improve. If closing the distance makes camping *better*, the ruling that a chase rewards the camper was right and this ADR is what has to move.

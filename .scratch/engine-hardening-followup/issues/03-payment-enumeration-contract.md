# 03 — The payment-enumeration contract (P1)

Status: open

## Scope

`legalActions()` enumerates every hand-card choice for `load_slot` and `charge_slot` but offers only `hand[0]` as representative payment for `move_hero`, `discard_for_stamina`, and `revive_ally`. Review 2 names the resulting contradiction precisely, and it sits in our own header comment: "the complete legal player action space" and "one representative action with `hand[0]`" cannot both be true. Discarding card A versus card B produces different future hands, so the current API silently drops strategically distinct actions from AI, search, hints, and simulation.

## Decision to make

Choose and document one contract. The reviewer recommends full enumeration of every legal payment-card alternative, with any compact UI affordance built as a presentation-layer grouping above the engine API. The EDOPro research note (2026-08-20) pulls the other way at the horizon: the future resumable-resolution seam's incremental questions subsume payment choice, so whichever way this lands, the record must mark it revisitable at that seam's trigger. If enumeration stays representative, the API documentation must stop claiming completeness.

## Acceptance criteria

- The API contract states explicitly whether payment variants are exhaustive or representative, in the `legalActions` header and the design-decision log.
- Tests demonstrate the chosen behavior with at least two distinct hand cards for movement, stamina discard, and revival.
- Every emitted command passes `legality()`.
- If UI grouping is added, it introduces no second legality authority.

## Validation

Full local gate. If enumeration output changes, sweep policies that consume `legalActions()` re-run to establish whether policy behavior shifts, with any change explained rather than blindly re-recorded.

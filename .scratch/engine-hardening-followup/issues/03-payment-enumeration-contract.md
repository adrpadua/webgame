# 03 — The payment-enumeration contract (P1)

Status: delivered (this session, D-107)

## Delivered

The contract is **complete enumeration** (D-107): `move_hero`, `discard_for_stamina`, and `revive_ally` now offer one action per hand card that could pay — the same completeness `load_slot` and `charge_slot` always had — and the `legalActions` header states it, replacing the representative-`hand[0]` convention that contradicted the API's own completeness claim. No grouping helper was built: the consumer survey found nothing outside the engine and its tests reads `legalActions` (the UI acts through `legality`/`fireTargeting`, sweep policies likewise), so there is no affordance to compress and no sweep, replay, or UI behavior that can shift. The projection is the first UI consumer's to build above the API. The whole contract is recorded as revisitable at the resumable-resolution seam, whose incremental questions would subsume payment choice.

Tests: two new `commandSpace.test.ts` cases with multi-card hands — movement offers the whole hand per destination, the bare discard offers the whole hand, the rescue offers the whole hand aimed at the one Downed ally — with the existing battery asserting every enumerated action passes `legality()`. Red proven: against the pre-fix enumeration exactly these two tests fail; the rest of the suite is indifferent.

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

Full local gate. The sweep-rerun clause turned out to be moot: no sweep policy consumes `legalActions()`, so enumeration width cannot shift recorded outputs.

## Evidence

Isolated gate green end to end on `130bac3`: casing guard silent, log:ids clean (D-107 assigned), 657 tests passed (the two new payment tests included), lint, build, and browser smoke clean, mutation audit **128/128 caught, 0 survived, 0 stale**, EXIT:0. Red half recorded above: exactly the two payment tests fail against the pre-fix enumeration.

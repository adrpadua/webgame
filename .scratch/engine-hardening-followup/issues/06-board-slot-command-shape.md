# 06 — The board_slot command shape (review 2, P2)

Status: delivered (this session, D-109)

## Delivered

- **The identity**: `targetSlot: { heroId, slotIndex }` (the `SlotTarget` type in `actions.ts`) — one structural value, so half an identity cannot be authored — carried identically through `PlayerCommandInput`, `scenarioActionSchema` (and therefore the runtime trust boundary, unchanged in authority), `fireTargeting` (`legalSlots: SlotTarget[]`), `legalActions`' fire expansion, `fireSlotLegality`, and the Counter host (`slotRef(heroId, slotIndex)` is the same pair collapsed to a key). It beat a two-optional-fields pair (no structural co-occurrence) and a bare `SlotRef` string (Scenario files should read as JSON, not parsed keys).
- **The reach**: legality accepts any party member's prepared Slot — D-035's "an ally's prepared Top Card", finally addressable. **D-009 stands**: support is adjacency-free, so there is no range and no owner-status rule, and `board_slot` stays outside the catalog's reaching set. The first draft added an ally-family range rule and was reverted on contact with the catalog's own D-009 comment — a standing ruling, not an oversight; the near-miss is recorded in the D-row so nobody re-fixes it.
- **Tests**: the contract matrix re-pinned on the new shape (candidates include a nonexistent owner), the only-prepared refusal, and a new duo probe — an ally's prepared Slot offered from two hexes with a rangeless card, unprepared refused, party-then-bar enumeration order. Two pre-existing `board_slot` staging tests in `engine.test.ts` converted to the new shape (the shape is the change; everything else in them is untouched).
- The Workbench completion gesture stays unbuilt (the family's first consumer's affordance, per issue 01's rule). No shipped content, sweep, or replay artifact names the family, so nothing recorded changes.

## Evidence

665/665 green with typecheck clean before the gate; `log:ids` assigned D-109 and carried the citations.

Full isolated gate green end to end: casing guard silent, log:ids clean (D-109 assigned, citations carried), 665 tests, lint, build, **SMOKE PASSED** with replay fingerprint match, mutation audit **130/130 caught, 0 survived, 0 stale**, inner EXIT:0.

## Scope

Review 2's genuinely new finding: `board_slot` is enumerated and validated syntactically, but the command carries only `targetSlotIndex` with no Hero, so `fireSlotLegality()` and `fireTargeting()` can only address the firing Hero's own bar. The rules documentation (D-035) describes the family as attaching to an *ally's* prepared Top Card, and the Party model now exists — the vocabulary is narrower than the authored rules language. The Workbench completion gesture is also deliberately unbuilt (issue 01 recorded that as the first consumer's problem).

## Decision to make

Choose one stable Slot identity — `targetHeroId` + `targetSlotIndex`, or a single `SlotRef` — and carry it consistently across every surface that names a Slot: `PlayerCommandInput`, `scenarioActionSchema`, `fireTargeting()` (`legalSlotIndexes` becomes a list of the chosen shape), `legalActions()`, `fireSlotLegality()`, Counter host resolution (`slotRef` already exists as the counters module's grammar and is the natural candidate), the Workbench targeting gesture, and replay/record tests.

## Acceptance criteria

- One representation, agreed across all eight surfaces, with the contract-matrix row updated to enumerate it.
- An ally's prepared Slot is reachable exactly when the rules say it is; an empty or missing Slot is refused by `legality()` alone.
- No board_slot card ships before this lands.

## Validation

Full local gate; the target-family contract matrix and command-space guards must both compile-force the new shape.

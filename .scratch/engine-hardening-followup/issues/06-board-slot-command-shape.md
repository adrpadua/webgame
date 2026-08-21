# 06 — The board_slot command shape (review 2, P2)

Status: open — blocking decision before the first board_slot card is authored

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

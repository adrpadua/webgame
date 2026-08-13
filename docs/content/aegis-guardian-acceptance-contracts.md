# Aegis Guardian: Executable Acceptance Contracts

Status: handoff specification for Architecture and QA. Do not add these cards to the live deck or change shared rules as part of this handoff.

`EncounterEngine` is authoritative. Each scenario must use public `start`, `apply`, and `advance_phase` calls, a fixed seed, and an Encounter snapshot at every named checkpoint. Use the QA setup seam `place_minion` only to create a Minion board state. Use typed `fire_slot(source_id, slot_index, target_id)` to resolve the selected target. Scene tests may assert the same projected state, but must not create a second rules path.

## 1. Whelp Clear And Minion Selection

**Design intent:** A Whelp is a visible route problem that the Guardian can deliberately remove. `Kill Adds` is honest only when the active deck contains an executable answer.

### Authored Inputs

- Top Card: `resources/cards/tank/sweeping_blow.tres`.
- Charged Card: any legal hand Card.
- Target: one `resources/minions/whelp.tres` Minion at Range 1.
- Whelp health: `2`.
- Sweeping Blow base target damage: `2`.

### Legal Action Sequence

1. Start a fixed-seed Encounter with Aegis Guardian, an empty Slot 1, Sweeping Blow and one other card in Hand.
2. Use setup-only `place_minion` to place one Whelp on an adjacent legal hex. Capture its returned entity ID as `whelp_id`.
3. Advance from Loadout through Instant to Quick.
4. Apply `LOAD_SLOT` for Sweeping Blow into Slot 1. The action succeeds.
5. Apply `CHARGE_SLOT` with the other hand Card. The action succeeds; the card becomes the single Charge.
6. Resolve typed `fire_slot(guardian_id, 0, whelp_id)`. The action succeeds.

### Required Snapshot And Outcome

| Checkpoint | Required state |
| --- | --- |
| After setup | `phase = loadout`; Slot 1 is empty; `whelp_id` exists at its authored adjacent hex with `health = 2`. |
| After Quick begins | `phase = quick`; Whelp remains on board; its hex is visible/selectable as a Minion target. |
| After load | Slot 1 `top_card.id = sweeping_blow`; `charges = []`; Sweeping Blow is no longer in Hand. |
| After charge | Slot 1 has exactly one Charge; the charged Card is no longer in Hand; Slot is not activated. |
| After fire | Typed fire succeeds; generated damage targets `whelp_id`; the successful damage Resolution Fact records `health_loss = 2` and `target_removed = true`; the Whelp is immediately absent from `board.entities`; its hex is unoccupied; Slot is marked activated for Quick; no Boss health changes. |

Minion removal is part of the successful damage resolution. It is not delayed until Quick cleanup, Slow, or Round end, and it emits no separate gameplay cleanup action.

The replay log must preserve the chosen `target_id`, target range, dealt amount `2`, `target_removed = true`, and fixed-seed state.

### Required Rejections

- `fire_slot(guardian_id, 0, empty_id)`: reject; no snapshot state changes.
- `fire_slot(guardian_id, 0, boss_id)`: reject because Sweeping Blow selects a Minion; no snapshot state changes.
- `fire_slot(guardian_id, 0, hero_id)`: reject because a Hero is not a Minion; no snapshot state changes.
- `fire_slot(guardian_id, 0, distant_whelp_id)`: reject because target distance exceeds 1; no snapshot state changes.
- `fire_slot(guardian_id, 0, whelp_id)` before at least one Charge: reject; no snapshot state changes.
- `fire_slot(guardian_id, 0, whelp_id)` during Loadout or Slow: reject; no snapshot state changes.

Target selection is explicit and typed: the caller supplies a single stable entity ID. The engine validates that the selected entity exists, is a Minion, and is within the Top Card's Range before any Card effect, damage, Hand, Charge Stack, or activation state changes. The engine does not auto-select a nearby Whelp.

### Evidence

Add one focused seeded replay scenario, `whelp_clear`, plus a scene-parity assertion that the selected Whelp disappears from the board after the successful fire. Preserve the existing nine probes.

## 2. Slow Top Card Activation And Full-Charge Cleanup

**Design intent:** The Slow Window is a deliberate commitment window. A Guardian can build a defensive reserve before firing it, but a fully charged fired ability spends its entire bundle at that window's end.

### Authored Inputs

- Top Card: `resources/cards/tank/fortify.tres`.
- Fortify timing: `slow`.
- Fortify Charge Value: `2`.
- Fortify base effect: gain `6` Armor.
- Two other legal hand Cards to use as Charges.

### Legal Action Sequence

1. Start a fixed-seed Encounter with Aegis Guardian, an empty Slot 1, Fortify and two other Cards in Hand.
2. In Loadout, apply `LOAD_SLOT` for Fortify into Slot 1. The action succeeds.
3. Advance through Instant to Quick.
4. Apply `CHARGE_SLOT` with the first Card. The action succeeds.
5. Advance through Incoming to Slow.
6. Apply `CHARGE_SLOT` with the second Card. The action succeeds and makes Fortify fully charged.
7. Resolve typed `fire_slot(guardian_id, 0, empty_id)`. The action succeeds because Fortify has no selected target.
8. Advance out of Slow. Full-Charge Cleanup runs before the next Loadout state.

### Required Snapshot And Outcome

| Checkpoint | Required state |
| --- | --- |
| After load | `phase = loadout`; Slot 1 `top_card.id = fortify`; no Charges. |
| During Quick | Fortify cannot fire because its Top Card is Slow. After the first Charge, Slot 1 has one Charge and remains unactivated. |
| At Slow before fire | Slot 1 has two Charges, equal to Fortify's Charge Value; Fortify is Primed and unactivated. |
| After fire | `phase = slow`; fire succeeds; Guardian Armor increases by exactly `6`; Slot remains populated with Fortify and its two Charges; Slot is activated for Slow. |
| At next Loadout | Slot 1 is empty; Fortify and both charged Cards are in Discard; neither is in Hand or a Slot. The next Round-start Armor reset occurs according to the existing Round rule. |

The replay log must preserve the Card IDs, Charge order, activation window, `max_charge = 2`, Armor delta `+6`, cleanup discard set, and fixed-seed state.

### Required Rejections

- `fire_slot(guardian_id, 0, empty_id)` in Loadout: reject; no snapshot state changes.
- `fire_slot(guardian_id, 0, empty_id)` in Quick after one or two Charges: reject; no snapshot state changes.
- `fire_slot(guardian_id, 0, empty_id)` in Slow with zero Charges: reject; no snapshot state changes.
- Add a third Charge to full Fortify: reject; no snapshot state changes.
- Add a Charge after Fortify fires in Slow: reject; no snapshot state changes.

### Evidence

Add one focused seeded replay scenario, `slow_top_card_cleanup`, plus a scene-parity assertion that the Slot displays two Charges before firing and empties only after Slow ends. Preserve the existing nine probes.

## Non-Goals

- Do not add Sweeping Blow or Fortify to the default `embermaw_prototype` deck yet.
- Do not implement Interception, ally selection, ally redirection, Whelp intent, Phase II, Threat, or multi-Hero behavior in these scenarios.
- Do not change the current Top Card, Charge Stack, Stamina, or cleanup contracts.

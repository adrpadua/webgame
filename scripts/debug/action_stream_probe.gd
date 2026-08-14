extends SceneTree

# Probe contract (ADR 0015): phase-machine state changes are first-class
# EncounterActions on the engine's history stream, and `advance_phase` returns
# the complete ordered slice of actions it produced. Observers fold the stream
# instead of re-deriving or diffing state.

const EncounterActionModel := preload("res://scripts/sdk/EncounterAction.gd")
const EncounterEngineModel := preload("res://scripts/sdk/EncounterEngine.gd")
const FacingDirections := preload("res://scripts/combat/Facing.gd")
const PlayerStateModel := preload("res://scripts/player/PlayerState.gd")

const STRIKE := preload("res://resources/cards/tank/steady_strike.tres")
const GUARD := preload("res://resources/cards/tank/iron_guard.tres")

var failures: Array[String] = []

func _initialize() -> void:
	_test_full_charge_cleanup_on_stream()
	_test_round_rollover_on_stream()
	_test_phase_transitions_on_stream()
	_test_end_of_clock_on_stream()
	_test_presentation_folds_the_stream()
	if failures.is_empty():
		print("ACTION_STREAM_PROBE_OK")
		quit()
		return
	for failure in failures:
		push_error(failure)
	quit(1)

func _test_full_charge_cleanup_on_stream() -> void:
	var engine = _engine([STRIKE, GUARD, GUARD, GUARD])
	engine.apply(EncounterActionModel.load_slot(&"guardian", 0, STRIKE))
	engine.advance_phase()
	engine.advance_phase()
	for _index in STRIKE.get_charge_cap():
		engine.apply(EncounterActionModel.charge_slot(&"guardian", 0, GUARD))
	engine.apply(EncounterActionModel.fire_slot(&"guardian", 0))
	var advance_slice: Array = engine.advance_phase()
	var cleanup_actions: Array = _of_kind(advance_slice, EncounterActionModel.Kind.FULL_CHARGE_CLEANUP)
	_assert(cleanup_actions.size() == 1, "Full-Charge Cleanup must appear in advance_phase's returned slice.")
	_assert(_of_kind(engine.history, EncounterActionModel.Kind.FULL_CHARGE_CLEANUP).size() == 1, "Full-Charge Cleanup must be recorded on the history stream.")
	if cleanup_actions.is_empty():
		return
	var cleanup = cleanup_actions[0]
	_assert(cleanup.succeeded, "The Full-Charge Cleanup action must resolve successfully.")
	_assert(cleanup.source_id == &"guardian", "Full-Charge Cleanup must name the owning Hero.")
	_assert(int(cleanup.payload.get("slot_index", -1)) == 0, "Full-Charge Cleanup must name the cleaned Slot.")
	_assert(cleanup.payload.get("window", &"") == &"quick", "A Quick Top Card must clean up at the end of Quick.")
	_assert(cleanup.payload.get("top_card") == STRIKE, "Cleanup must record the discarded Top Card.")
	_assert(cleanup.payload.get("charge_cards", []).size() == STRIKE.get_charge_cap(), "Cleanup must record every discarded charged card.")
	var hero: Dictionary = engine.get_hero(&"guardian")
	_assert(hero["action_bar"][0]["top_card"] == null and hero["action_bar"][0]["charges"].is_empty(), "Cleanup resolution must clear the Slot.")
	_assert(hero["discard"].size() == 1 + STRIKE.get_charge_cap(), "Cleanup resolution must discard the Top Card and its Charge Stack.")

func _test_round_rollover_on_stream() -> void:
	# Empty deck + one discarded Stamina card forces the refill to reshuffle,
	# so the rollover must emit ROUND_START, SHUFFLE_DECK, then DRAW_CARD.
	var engine = _engine([STRIKE, GUARD, GUARD, GUARD])
	engine.advance_phase()
	engine.advance_phase()
	engine.apply(EncounterActionModel.move_hero(&"guardian", Vector2i(0, 1), STRIKE))
	engine.advance_phase()
	engine.advance_phase()
	var rollover_slice: Array = engine.advance_phase()
	var round_starts: Array = _of_kind(rollover_slice, EncounterActionModel.Kind.ROUND_START)
	var shuffles: Array = _of_kind(rollover_slice, EncounterActionModel.Kind.SHUFFLE_DECK)
	var draws: Array = _of_kind(rollover_slice, EncounterActionModel.Kind.DRAW_CARD)
	_assert(round_starts.size() == 1, "The Round rollover must emit exactly one ROUND_START action.")
	_assert(shuffles.size() == 1, "An exhausted deck with a discard pile must emit one SHUFFLE_DECK action.")
	_assert(draws.size() == 1, "Refilling one missing hand card must emit one DRAW_CARD action.")
	if round_starts.is_empty() or shuffles.is_empty() or draws.is_empty():
		return
	_assert(int(round_starts[0].payload.get("round", -1)) == 2, "ROUND_START must name the Round it begins.")
	_assert(rollover_slice.find(round_starts[0]) < rollover_slice.find(shuffles[0]) and rollover_slice.find(shuffles[0]) < rollover_slice.find(draws[0]), "The slice must order ROUND_START before SHUFFLE_DECK before DRAW_CARD.")
	_assert(draws[0].payload.get("card") == STRIKE, "DRAW_CARD must record the drawn card at resolution.")
	_assert(shuffles[0].payload.get("label", &"") == &"discard_shuffle", "SHUFFLE_DECK must carry the seeded shuffle label.")
	_assert(engine.round == 2 and engine.phase == &"loadout", "The rollover must still land in next-Round Loadout.")
	_assert(engine.get_hero(&"guardian")["hand"].size() == 4, "The Persistent Hand must refill to its target through the stream.")

func _test_phase_transitions_on_stream() -> void:
	var engine = _engine([STRIKE, GUARD, GUARD, GUARD])
	var transitions: Array = []
	for _step in 5:
		var slice: Array = engine.advance_phase()
		_assert(not slice.is_empty() and slice.back().kind == EncounterActionModel.Kind.ADVANCE_PHASE, "Each advance must end its slice with the boundary's ADVANCE_PHASE action.")
		for action in _of_kind(slice, EncounterActionModel.Kind.ADVANCE_PHASE):
			transitions.append("%s>%s" % [action.payload.get("from_phase"), action.payload.get("to_phase")])
	_assert(transitions == ["loadout>instant", "instant>quick", "quick>incoming", "incoming>slow", "slow>loadout"], "A full Round must stream its five phase transitions in order (got %s)." % str(transitions))
	_assert(engine.round == 2 and engine.phase == &"loadout", "The streamed transitions must land in next-Round Loadout.")
	# A fired, non-full Slot keeps its cards across the boundary: the window
	# flag clears when the ADVANCE_PHASE resolves, with no Full-Charge Cleanup.
	var flag_engine = _engine([STRIKE, GUARD, GUARD, GUARD])
	flag_engine.apply(EncounterActionModel.load_slot(&"guardian", 0, STRIKE))
	flag_engine.advance_phase()
	flag_engine.advance_phase()
	flag_engine.apply(EncounterActionModel.charge_slot(&"guardian", 0, GUARD))
	flag_engine.apply(EncounterActionModel.fire_slot(&"guardian", 0))
	_assert(flag_engine.get_hero(&"guardian")["action_bar"][0]["activated_window"] == &"quick", "Firing must mark the Slot's activated window.")
	var boundary_slice: Array = flag_engine.advance_phase()
	_assert(_of_kind(boundary_slice, EncounterActionModel.Kind.FULL_CHARGE_CLEANUP).is_empty(), "A non-full fired Slot must not stream a Full-Charge Cleanup.")
	var boundary_slot: Dictionary = flag_engine.get_hero(&"guardian")["action_bar"][0]
	_assert(boundary_slot["activated_window"] == &"" and boundary_slot["charges"].size() == 1, "The ADVANCE_PHASE resolution must clear the window flag and keep the Charge Stack.")

func _test_end_of_clock_on_stream() -> void:
	var engine := EncounterEngineModel.new()
	engine.start({
		"board_radius": 2,
		"round_limit": 1,
		"enrage_text": "Embermaw devours the raid.",
		"boss": {"id": &"boss", "coords": Vector2i(1, -1), "health": 36, "facing": FacingDirections.Direction.SOUTH_WEST},
		"heroes": [{"id": &"guardian", "coords": Vector2i(0, 0), "health": 34, "slot_count": 2}],
		"primary_hero_id": &"guardian",
	})
	var last_slice: Array = []
	for _step in 5:
		last_slice = engine.advance_phase()
	var clock_actions: Array = _of_kind(last_slice, EncounterActionModel.Kind.END_OF_CLOCK)
	_assert(clock_actions.size() == 1, "Encounter Clock expiry must stream exactly one END_OF_CLOCK action.")
	_assert(_of_kind(last_slice, EncounterActionModel.Kind.ROUND_START).is_empty(), "An expired clock must not start another Round.")
	if clock_actions.is_empty():
		return
	var clock = clock_actions[0]
	_assert(clock.succeeded and clock == last_slice.back(), "END_OF_CLOCK must be the final action of its slice.")
	_assert(int(clock.payload.get("round", -1)) == 2 and str(clock.payload.get("reason", "")) == "Embermaw devours the raid.", "END_OF_CLOCK must carry the expiry Round and authored enrage reason.")
	_assert(not engine.active and engine.outcome == &"defeat" and engine.round == 2, "END_OF_CLOCK resolution must end the Encounter in defeat past the limit.")
	_assert(_of_kind(engine.history, EncounterActionModel.Kind.END_OF_CLOCK).size() == 1, "END_OF_CLOCK must be recorded on the history stream.")

func _test_presentation_folds_the_stream() -> void:
	# The scene-facing PlayerState projection derives Slot transition cues by
	# folding the stream — no snapshot diffing, consumed once per read.
	var engine = _engine([STRIKE, GUARD, GUARD, GUARD])
	var player := PlayerStateModel.new()
	player.bind_engine(engine, &"guardian")
	engine.apply(EncounterActionModel.load_slot(&"guardian", 0, STRIKE))
	player.sync_from_engine()
	_assert(player.take_slot_transitions() == {0: &"load"}, "Loading must fold into a `load` transition for its Slot.")
	_assert(player.take_slot_transitions().is_empty(), "Slot transitions must be consumed by the read.")
	engine.advance_phase()
	engine.advance_phase()
	player.sync_from_engine()
	_assert(player.take_slot_transitions().is_empty(), "Phase transitions alone must produce no Slot transition cues.")
	for _index in STRIKE.get_charge_cap():
		engine.apply(EncounterActionModel.charge_slot(&"guardian", 0, GUARD))
	player.sync_from_engine()
	_assert(player.take_slot_transitions() == {0: &"charge"}, "Charging must fold into a `charge` transition.")
	engine.apply(EncounterActionModel.fire_slot(&"guardian", 0))
	player.sync_from_engine()
	_assert(player.take_slot_transitions() == {0: &"activate"}, "Firing must fold into an `activate` transition.")
	engine.advance_phase()
	player.sync_from_engine()
	_assert(player.take_slot_transitions() == {0: &"cleanup"}, "Full-Charge Cleanup on the stream must fold into a `cleanup` transition.")
	player.free()

func _of_kind(actions: Array, kind: int) -> Array:
	var result: Array = []
	for action in actions:
		if action.kind == kind:
			result.append(action)
	return result

func _engine(hand: Array):
	var engine := EncounterEngineModel.new()
	engine.start({
		"board_radius": 2,
		"round_limit": 8,
		"boss": {"id": &"boss", "coords": Vector2i(1, -1), "health": 36, "facing": FacingDirections.Direction.SOUTH_WEST},
		"heroes": [{"id": &"guardian", "coords": Vector2i(0, 0), "health": 34, "slot_count": 2, "hand": hand, "refill_target": hand.size()}],
		"primary_hero_id": &"guardian",
	})
	return engine

func _assert(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)

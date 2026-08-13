class_name TurnManager
extends Node

signal phase_changed(phase: StringName)
signal turn_changed(turn_number: int)

enum Phase {
	LOADOUT,
	INSTANT,
	QUICK,
	INCOMING,
	SLOW,
}

var phase: Phase = Phase.LOADOUT
var turn_number: int = 1
var _engine

func bind_engine(engine) -> void:
	_engine = engine
	sync_from_engine()

func sync_from_engine() -> void:
	if _engine == null:
		return
	var previous_phase := phase
	var previous_round := turn_number
	phase = _phase_from_name(_engine.phase)
	turn_number = _engine.round
	if phase != previous_phase:
		phase_changed.emit(get_phase_name())
	if turn_number != previous_round:
		turn_changed.emit(turn_number)

# Kept for older probes; all phase rules still execute inside EncounterEngine.
func advance_phase(player = null) -> void:
	if _engine == null:
		return
	_engine.advance_phase()
	sync_from_engine()
	if player != null and player.has_method("sync_from_engine"):
		player.sync_from_engine()

func get_phase_name() -> StringName:
	match phase:
		Phase.LOADOUT:
			return &"Loadout Step"
		Phase.INSTANT:
			return &"Boss Instant"
		Phase.QUICK:
			return &"Quick Window"
		Phase.INCOMING:
			return &"Boss Incoming"
		Phase.SLOW:
			return &"Slow Window"
	return &"Unknown"

func _phase_from_name(value: StringName) -> Phase:
	match value:
		&"instant":
			return Phase.INSTANT
		&"quick":
			return Phase.QUICK
		&"incoming":
			return Phase.INCOMING
		&"slow":
			return Phase.SLOW
	return Phase.LOADOUT

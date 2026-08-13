class_name TurnManager
extends Node

signal phase_changed(phase: StringName)
signal turn_changed(turn_number: int)

enum Phase {
	INSTANT,
	QUICK,
	INCOMING,
	SLOW
}

var phase: Phase = Phase.INSTANT
var turn_number: int = 1

func start_game(player) -> void:
	turn_number = 1
	phase = Phase.INSTANT
	player.begin_round()
	turn_changed.emit(turn_number)
	phase_changed.emit(get_phase_name())

func advance_phase(player) -> void:
	match phase:
		Phase.INSTANT:
			phase = Phase.QUICK
			player.start_window(&"quick")
		Phase.QUICK:
			phase = Phase.INCOMING
		Phase.INCOMING:
			phase = Phase.SLOW
			player.start_window(&"slow")
		Phase.SLOW:
			turn_number += 1
			phase = Phase.INSTANT
			player.begin_round()
			turn_changed.emit(turn_number)
	phase_changed.emit(get_phase_name())

func get_phase_name() -> StringName:
	match phase:
		Phase.INSTANT:
			return &"Boss Instant"
		Phase.QUICK:
			return &"Quick Window"
		Phase.INCOMING:
			return &"Boss Incoming"
		Phase.SLOW:
			return &"Slow Window"
	return &"Unknown"

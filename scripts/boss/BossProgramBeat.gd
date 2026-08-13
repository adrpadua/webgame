class_name BossProgramBeat
extends Resource

enum Kind {
	TURN_TOWARD_PLAYER,
	RAKING_CLAW,
	SCORCH_LAST_PATTERN,
	CINDER_BREATH,
	BROOD_CALL,
	WARNING,
}

@export var id: StringName
@export var title: String = "Boss Beat"
@export_multiline var rules_text: String = ""
@export var kind: Kind = Kind.WARNING
@export var counter_tags: Array[StringName] = []
@export var damage: int = 0
@export var duration_rounds: int = 1
@export var hazard: Resource
@export var minion: Resource
@export_range(1, 12, 1) var count: int = 2

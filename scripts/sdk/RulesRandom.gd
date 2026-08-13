class_name RulesRandom
extends RefCounted

var seed: int = 1
var _generator := RandomNumberGenerator.new()
var choices: Array[Dictionary] = []

func _init(initial_seed: int = 1) -> void:
	reset(initial_seed)

func reset(initial_seed: int) -> void:
	seed = initial_seed
	_generator.seed = seed
	choices.clear()

func randi_range(minimum: int, maximum: int, label: StringName = &"random") -> int:
	var value := _generator.randi_range(minimum, maximum)
	choices.append({"label": str(label), "minimum": minimum, "maximum": maximum, "value": value})
	return value

func shuffle(values: Array, label: StringName = &"shuffle") -> void:
	for index in range(values.size() - 1, 0, -1):
		var swap_index := self.randi_range(0, index, label)
		var value = values[index]
		values[index] = values[swap_index]
		values[swap_index] = value

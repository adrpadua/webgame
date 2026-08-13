class_name BossProgramData
extends Resource

@export var id: StringName
@export var title: String = "Boss Program"
@export_multiline var rules_text: String = ""
@export var instant_beats: Array[BossProgramBeat] = []
@export var incoming_beats: Array[BossProgramBeat] = []

func get_track_lines(track: StringName) -> Array[String]:
	var beats: Array[BossProgramBeat] = instant_beats if track == &"instant" else incoming_beats
	var lines: Array[String] = []
	for index in beats.size():
		lines.append("%d. %s" % [index + 1, beats[index].title])
	return lines

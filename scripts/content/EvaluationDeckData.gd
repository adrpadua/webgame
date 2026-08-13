class_name EvaluationDeckData
extends Resource

@export var id: StringName
@export var title: String = "Evaluation Deck"
@export_multiline var rules_text: String = ""
@export var encounter: Resource
@export var player_deck: Array[Resource] = []

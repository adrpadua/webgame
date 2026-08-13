class_name PlayerState
extends Node

const FacingDirections := preload("res://scripts/combat/Facing.gd")

signal hand_changed
signal resources_changed
signal board_changed
signal health_changed
signal facing_changed
signal action_bar_changed

@export var hero_name: String = "Aegis Guardian"
@export var role: StringName = &"tank"
@export var max_hand_size: int = 7
@export var starting_energy: int = 3
@export var energy_per_turn: int = 3
@export var max_health: int = 34
@export var draw_per_turn: int = 1
@export var tempo_per_window: int = 2
@export var slot_count: int = 2

var energy: int = 0:
	set(value):
		energy = max(value, 0)
		resources_changed.emit()

var tempo: int = 0:
	set(value):
		tempo = max(value, 0)
		resources_changed.emit()

var health: int = 0:
	set(value):
		health = clamp(value, 0, max_health)
		health_changed.emit()

var armor: int = 0:
	set(value):
		armor = max(value, 0)
		resources_changed.emit()

var presence: int = 1:
	set(value):
		presence = max(value, 0)
		resources_changed.emit()

@export_enum("E", "NE", "NW", "W", "SW", "SE") var facing: int = FacingDirections.Direction.NORTH_EAST:
	set(value):
		facing = FacingDirections.normalize_hex_edge_facing(value, "Player facing")
		facing_changed.emit()

var deck: Array = []
var discard: Array = []
var hand: Array = []
var board_slots: Array[Dictionary] = []
var action_bar: Array[Dictionary] = []
var current_window: StringName = &"none"

func _ready() -> void:
	reset_for_encounter()

func reset_for_encounter() -> void:
	energy = starting_energy
	tempo = 0
	health = max_health
	armor = 0
	presence = 1
	current_window = &"none"
	board_slots = [
		{"id": &"growth", "label": "Growth", "card": null},
		{"id": &"presence", "label": "Presence", "card": null},
		{"id": &"power", "label": "Power", "card": null},
		{"id": &"innate", "label": "Innate", "card": null},
	]
	action_bar = []
	for i in range(slot_count):
		action_bar.append({
			"top_card": null,
			"charges": [],
		})
	hand_changed.emit()
	action_bar_changed.emit()

func begin_round() -> void:
	armor = 0
	tempo = 0
	current_window = &"none"
	energy += energy_per_turn
	draw_cards(draw_per_turn)

func start_window(window_speed: StringName) -> void:
	current_window = window_speed
	tempo = tempo_per_window
	action_bar_changed.emit()

func load_deck(cards: Array) -> void:
	deck = cards.duplicate()
	deck.shuffle()
	hand.clear()
	discard.clear()
	hand_changed.emit()

func draw_cards(count: int) -> void:
	for i in range(count):
		if deck.is_empty():
			if discard.is_empty():
				break
			deck = discard.duplicate()
			discard.clear()
			deck.shuffle()
		if hand.size() < max_hand_size:
			hand.append(deck.pop_back())
	hand_changed.emit()

func play_card(card: Resource, context: Dictionary = {}) -> bool:
	if not hand.has(card) or not card.can_pay(self):
		return false
	card.apply(self, context)
	hand.erase(card)
	discard.append(card)
	hand_changed.emit()
	return true

func place_on_board(slot_index: int, card: Resource, context: Dictionary = {}) -> bool:
	if slot_index < 0 or slot_index >= board_slots.size() or not hand.has(card):
		return false
	if board_slots[slot_index]["card"] != null:
		return false
	card.apply(self, context)
	hand.erase(card)
	board_slots[slot_index]["card"] = card
	hand_changed.emit()
	board_changed.emit()
	return true

func prepare_slot(slot_index: int, card: Resource) -> bool:
	if not hand.has(card) or tempo < 1:
		return false
	if slot_index < 0 or slot_index >= action_bar.size():
		return false
	var slot := action_bar[slot_index]
	if slot["top_card"] != null and not slot["charges"].is_empty():
		return false
	tempo -= 1
	hand.erase(card)
	if slot["top_card"] != null:
		discard.append(slot["top_card"])
	slot["top_card"] = card
	slot["charges"] = []
	hand_changed.emit()
	action_bar_changed.emit()
	return true

func charge_slot(slot_index: int, card: Resource) -> bool:
	if not hand.has(card) or tempo < 1:
		return false
	if slot_index < 0 or slot_index >= action_bar.size():
		return false
	var slot := action_bar[slot_index]
	var top_card: Resource = slot["top_card"]
	if top_card == null:
		return false
	if slot["charges"].size() >= top_card.get_charge_cap():
		return false
	tempo -= 1
	hand.erase(card)
	slot["charges"].append(card)
	hand_changed.emit()
	action_bar_changed.emit()
	return true

func activate_slot(slot_index: int, context: Dictionary = {}) -> bool:
	if get_activation_error(slot_index, context) != "":
		return false
	var slot := action_bar[slot_index]
	var top_card: Resource = slot["top_card"]
	var payload := context.duplicate()
	payload["charge_stack"] = slot["charges"].duplicate()
	top_card.apply(self, payload)
	for charged_card in slot["charges"]:
		discard.append(charged_card)
	slot["charges"].clear()
	action_bar_changed.emit()
	return true

func get_activation_error(slot_index: int, context: Dictionary = {}) -> String:
	if slot_index < 0 or slot_index >= action_bar.size():
		return "Select an action-bar slot."
	var slot := action_bar[slot_index]
	var top_card: Resource = slot["top_card"]
	if top_card == null:
		return "That action-bar slot is empty."
	if slot["charges"].is_empty():
		return "Charge %s with a hand card before activating it." % top_card.title
	if top_card.get_window_speed() != current_window:
		return "%s is a %s card." % [top_card.title, top_card.get_window_speed().capitalize()]
	if not top_card.can_pay(self):
		return "Not enough Energy for %s." % top_card.title
	return top_card.get_target_error(context)

func get_slot(slot_index: int) -> Dictionary:
	if slot_index < 0 or slot_index >= action_bar.size():
		return {}
	return action_bar[slot_index]

func gain_armor(amount: int) -> void:
	armor += amount

func heal(amount: int) -> void:
	health += amount

func gain_presence(amount: int) -> void:
	presence += amount

func take_damage(amount: int) -> int:
	var blocked: int = min(armor, amount)
	armor -= blocked
	var remaining: int = amount - blocked
	health -= remaining
	return remaining

func rotate_facing(steps: int) -> void:
	facing = facing + steps

func get_facing_name() -> String:
	return FacingDirections.name_for(facing)

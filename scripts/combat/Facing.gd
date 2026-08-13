class_name Facing
extends RefCounted

enum Direction {
	EAST,
	NORTH_EAST,
	NORTH_WEST,
	WEST,
	SOUTH_WEST,
	SOUTH_EAST,
}

const VALID_DIRECTIONS := [
	Direction.EAST,
	Direction.NORTH_EAST,
	Direction.NORTH_WEST,
	Direction.WEST,
	Direction.SOUTH_WEST,
	Direction.SOUTH_EAST,
]

static func assert_hex_edge_facing(direction: int, context: String = "Facing") -> int:
	assert(direction in VALID_DIRECTIONS, "%s must align to one of the six hex edges." % context)
	return direction

static func normalize_hex_edge_facing(direction: int, context: String = "Facing") -> int:
	return assert_hex_edge_facing(wrapi(direction, 0, VALID_DIRECTIONS.size()), context)

static func name_for(direction: int) -> String:
	match assert_hex_edge_facing(direction):
		Direction.EAST:
			return "E"
		Direction.NORTH_EAST:
			return "NE"
		Direction.NORTH_WEST:
			return "NW"
		Direction.WEST:
			return "W"
		Direction.SOUTH_WEST:
			return "SW"
		Direction.SOUTH_EAST:
			return "SE"
	return "?"

static func vector_for(direction: int) -> Vector2:
	match normalize_hex_edge_facing(direction):
		Direction.EAST:
			return Vector2(1.0, 0.0)
		Direction.NORTH_EAST:
			return Vector2(0.51, -0.86)
		Direction.NORTH_WEST:
			return Vector2(-0.51, -0.86)
		Direction.WEST:
			return Vector2(-1.0, 0.0)
		Direction.SOUTH_WEST:
			return Vector2(-0.51, 0.86)
		Direction.SOUTH_EAST:
			return Vector2(0.51, 0.86)
	return Vector2.UP

static func direction_for_axial_delta(delta: Vector2i) -> int:
	match delta:
		Vector2i(1, 0):
			return Direction.EAST
		Vector2i(1, -1):
			return Direction.NORTH_EAST
		Vector2i(0, -1):
			return Direction.NORTH_WEST
		Vector2i(-1, 0):
			return Direction.WEST
		Vector2i(-1, 1):
			return Direction.SOUTH_WEST
		Vector2i(0, 1):
			return Direction.SOUTH_EAST
	assert(false, "Facing delta must be one legal adjacent hex edge.")
	return Direction.EAST

static func axial_delta_for(direction: int) -> Vector2i:
	match normalize_hex_edge_facing(direction):
		Direction.EAST:
			return Vector2i(1, 0)
		Direction.NORTH_EAST:
			return Vector2i(1, -1)
		Direction.NORTH_WEST:
			return Vector2i(0, -1)
		Direction.WEST:
			return Vector2i(-1, 0)
		Direction.SOUTH_WEST:
			return Vector2i(-1, 1)
		Direction.SOUTH_EAST:
			return Vector2i(0, 1)
	return Vector2i.ZERO

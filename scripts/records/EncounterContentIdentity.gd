class_name EncounterContentIdentity
extends RefCounted

static func describe(root: Resource) -> Dictionary:
	var resources: Array = []
	var visited: Dictionary = {}
	_collect(root, resources, visited)
	resources.sort_custom(func(first: Dictionary, second: Dictionary) -> bool: return str(first["path"]) < str(second["path"]))
	var graph := {"root": _resource_ref(root), "resources": resources}
	return {
		"root": _resource_ref(root),
		"resources": resources.map(func(resource: Dictionary) -> Dictionary: return {"id": resource["id"], "path": resource["path"]}),
		"fingerprint": JSON.stringify(graph).sha256_text(),
	}

static func _collect(resource: Resource, resources: Array, visited: Dictionary) -> void:
	if resource == null:
		return
	var identity := "%s|%s" % [resource.resource_path, str(resource.get("id"))]
	if visited.has(identity):
		return
	visited[identity] = true
	var properties: Dictionary = {}
	var property_names: Array[String] = []
	for property in resource.get_property_list():
		if int(property.get("usage", 0)) & PROPERTY_USAGE_STORAGE and property.get("name", "") != "resource_path":
			property_names.append(str(property["name"]))
	property_names.sort()
	for property_name in property_names:
		var property_value = resource.get(property_name)
		properties[property_name] = _value(property_value)
		_collect_value(property_value, resources, visited)
	resources.append({"id": str(resource.get("id")), "path": resource.resource_path, "type": resource.get_class(), "properties": properties})

static func _collect_value(value, resources: Array, visited: Dictionary) -> void:
	if value is Resource:
		_collect(value, resources, visited)
	elif value is Array:
		for item in value:
			_collect_value(item, resources, visited)
	elif value is Dictionary:
		for key in value:
			_collect_value(value[key], resources, visited)

static func _value(source):
	if source == null:
		return null
	if source is Vector2i:
		return {"q": source.x, "r": source.y}
	if source is StringName:
		return str(source)
	if source is Resource:
		return _resource_ref(source)
	if source is Array:
		return source.map(func(item): return _value(item))
	if source is Dictionary:
		var result: Dictionary = {}
		var keys: Array = source.keys()
		keys.sort_custom(func(first, second): return str(first) < str(second))
		for key in keys:
			result[str(key)] = _value(source[key])
		return result
	return source

static func _resource_ref(resource: Resource) -> Dictionary:
	if resource == null:
		return {"id": "", "path": ""}
	return {"id": str(resource.get("id")), "path": resource.resource_path}

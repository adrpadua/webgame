extends SceneTree

const ContentValidatorModel := preload("res://scripts/content/ContentValidator.gd")

func _initialize() -> void:
	var validator := ContentValidatorModel.new()
	var errors: Array[String] = validator.validate_all()
	if not errors.is_empty():
		for error in errors:
			push_error(error)
		print("CONTENT_VALIDATION_FAILED errors=%d" % errors.size())
		quit(1)
		return
	var valid_resource_count := validator._resources.size()
	validator.errors.clear()
	validator._validate_card(load("res://scripts/debug/fixtures/invalid_card.tres"))
	var report := "\n".join(validator.errors)
	if not report.contains("res://scripts/debug/fixtures/invalid_card.tres") or not report.contains("timing") or not report.contains("Charge Value") or not report.contains("Unknown Keyword"):
		push_error("Content validator failures must include the Resource path and actionable timing, Charge Value, and Keyword guidance.")
		quit(1)
		return
	print("CONTENT_VALIDATION_OK resources=%d negative_contract=ok" % valid_resource_count)
	quit()

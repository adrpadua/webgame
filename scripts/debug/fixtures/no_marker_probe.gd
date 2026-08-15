extends SceneTree

# Runner self-test fixture: exits successfully without printing its declared
# marker. A correct adapter must FAIL this probe — an exit code alone is not
# evidence that anything was asserted.

func _initialize() -> void:
	quit()

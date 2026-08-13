# Use a headless rules SDK as the Encounter source of truth

The game will keep scene-free encounter rules in `scripts/sdk/`, centered on `EncounterEngine.start`, `EncounterEngine.apply`, and `EncounterEngine.advance_phase`; Godot scenes will adapt those action records as the visual prototype migrates. We chose this over growing scene controllers into the rules owner because Boss Timeline resolution, Slot rules, hex legality, Status Effects, and Hazards must be testable and reusable without booting a scene, while the current prototype UI can move over incrementally.

# Use a headless rules SDK as the Encounter source of truth

The game keeps scene-free Encounter rules in `scripts/sdk/`, centered on `EncounterEngine.start`, `EncounterEngine.apply`, and `EncounterEngine.advance_phase`. Godot scenes submit action records and render engine projections; scene controllers do not own a parallel rules path. We chose this over growing scene controllers into the rules owner because Boss Timeline resolution, Slot rules, hex legality, Status Effects, Hazards, and outcomes must be identical in simulation and the playable build.

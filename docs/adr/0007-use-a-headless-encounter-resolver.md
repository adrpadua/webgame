# Use a headless Encounter Resolver for Boss Timeline spatial rules

Boss Timeline beats resolve through a headless `EncounterResolver` that accepts an `EncounterSnapshot` and returns an `EncounterResolution`; Godot-facing `BossState` applies that result to the player, board, terrain, and Minions. This takes the high-leverage parts of Duelyst's SDK approach without importing its PvP, networking, rollback, or collectible-card architecture, so encounter rules can be verified without a scene and presentation can change without duplicating combat logic.

# Use a headless Encounter Resolver for Boss Timeline spatial rules

Status: superseded as the top-level ownership decision by ADR 0009; the internal `EncounterResolver` and its snapshot/resolution DTOs were folded into `TimelineResolver` by ADR 0016. Scene-free verification of Boss Timeline spatial rules is preserved through the engine seam.

Boss Timeline beats resolve through a headless `EncounterResolver` that accepts an `EncounterSnapshot` and returns an `EncounterResolution`; Godot-facing `BossState` applies that result to the player, board, terrain, and Minions. This takes the high-leverage parts of Duelyst's SDK approach without importing its PvP, networking, rollback, or collectible-card architecture, so encounter rules can be verified without a scene and presentation can change without duplicating combat logic.

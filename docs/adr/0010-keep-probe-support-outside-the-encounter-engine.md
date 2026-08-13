# Keep Probe support outside the Encounter Engine

The scene-free `EncounterEngine` remains the source of truth for Encounter rules. Probes live in `scripts/debug/` and observe the engine through public actions, phase advancement, and visible projections. We chose this placement so test diagnostics and fixtures do not expand the production rules interface or let helpers become a second gameplay implementation.

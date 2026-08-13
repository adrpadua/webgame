# Authored Data

This directory is reserved for structured, machine-readable authored content when it outgrows the current Godot `.tres` resources.

- `decks/`: decklists, card pools, and progression payloads
- `encounters/`: encounter setup and difficulty variants
- `localization/`: player-facing strings and translation tables

Use [docs/content](D:/dev/webgame/docs/content) for the readable design counterpart to a data package. Keep a package name consistent across both locations, such as `embermaw-prototype`.

Do not duplicate the live values from `.tres` files here until the loader actually consumes this data.

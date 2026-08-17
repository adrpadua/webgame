# Documentation Map

Use this directory for the durable record of how the game works and why it is built that way.

**Two clients, one live.** The Godot codebase is frozen (ADR 0019) and the playable surface is the Encounter Workbench in `web/`. Any document naming `.gd` scripts, `.tscn` scenes, `run_probes.ps1`, or a Windows `D:\dev\webgame` path is describing the frozen build.

- [adr](adr): decisions that are intentionally hard to rediscover later
- [rules](rules): player-facing and prototype rules
- [rules/headless-rules-sdk.md](rules/headless-rules-sdk.md): scene-free encounter architecture and headless verification contract
- [rules/mechanical-pillars-and-inspirations.md](rules/mechanical-pillars-and-inspirations.md): which reference games inform the design, and what this repo is not trying to import from them
- [content](content): authored decks, encounters, boss scripts, and role kits
- [content/oathcraft-interface-direction.md](content/oathcraft-interface-direction.md): the locked interface direction — materials, palette, plate geometry, components
- [content/oathcraft-board-direction.md](content/oathcraft-board-direction.md): the locked board direction — tints, lighting, and motion, consuming the palette above
- [content/design-team-handoff.md](content/design-team-handoff.md): supported Resource schemas and the designer validation/playtest loop
- [artifacts](artifacts): catalog of implementation and gameplay artifacts — see its [README](artifacts/README.md) first, because most of it is a Godot-era record
- [agents](agents): repository-maintenance material for coding agents, including the [agent recovery kit](agents/recovery-kit.md) and copy-ready role prompts

Put loose investigation, screenshots, and early ideas in [notes](../notes), then promote stable decisions into the appropriate `docs/` area.

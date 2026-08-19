# Authored Data

This directory holds the authored gameplay content as schema-validated JSON (ADR 0020). The Encounter Engine in `web/src/engine/` validates every file at load through its zod schemas; the frozen Godot `.tres` resources remain in `resources/` as reference copies only.

- `cards/`: player card definitions
- `heroes/`: Hero definitions — identity, health pool, and the printed Signature; Encounters field one by id (ADR 0034)
- `keywords/`: the one tag namespace — Card tags, a Beat's Role selector, what a blow is made of, and the answers a Program demands, each declaring its `kind`
- `charge_modifiers/`: explicit Top Card rules that read the Charge Stack
- `hazards/`: temporary board effects attached to hexes
- `minions/`: non-Boss Enemy definitions
- `counters/`: named markers a combatant, hex, or prepared Slot can hold, plus the Readers that give them meaning
- `boss_programs/`: authored Instant and Incoming rows of Boss Beats
- `encounters/`: encounter setup, deck list, and Boss Program sequence
- `decks/`, `localization/`: reserved for future payloads

Use [docs/content](../docs/content) for the readable design counterpart to a data package. Keep a package name consistent across both locations, such as `embermaw-prototype`.

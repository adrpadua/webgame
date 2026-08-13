# Design Team Handoff

This build is ready for data-only iteration on Cards, Keywords, Charge Modifiers, Boss Programs and Beats, Hazards, Minions, and Encounters. Ordinary content belongs under `resources/`; do not edit `Main.gd`, scene projections, or SDK resolvers to tune content.

`resources/legacy/` is excluded from authoring and validation. It preserves historical experiments only; do not duplicate content from it into an Encounter.

## Daily Workflow

1. Duplicate the closest `.tres` example in the appropriate `resources/` directory.
2. Give it a stable lowercase `snake_case` ID and complete player-facing title/rules text.
3. Reference it from a Card, Boss Program, or Encounter as needed.
4. Validate authored content:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe content
```

5. Run the player-facing parity playtest:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/run_probes.ps1 -Probe parity
```

Validation errors name the Resource path, invalid field/reference, and expected correction. Run the full suite with `-Probe all` before asking engineering to review a content batch.

## Encounter Evidence

Every completed playable **Encounter** now writes a local, Git-ignored **Encounter Record** beneath `tmp/encounter-records/`. A restart or abort writes an `abandoned` record with its explicit reason. The player HUD does not expose this data.

Each Record has a versioned JSON document (`schema_version: 1`) and a matching Markdown summary. It includes the seed, authored Resource IDs and paths, content fingerprint, submitted/generated/rejected actions, explicit damage Resolution Facts, phase boundaries, outcome, end reason, and final rules snapshot. Use the fingerprint when comparing deck or Boss Program experiments: aggregate results are split by fingerprint so changed content is never silently mixed with older playthroughs.

After playing one or more Encounters, generate the design report:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/debug/report_encounter_records.ps1
```

This writes a timestamped aggregate report and replaces `tmp/encounter-records/latest-report.md`. Invalid, malformed, and unsupported-schema records are skipped with path-based diagnostics; the command fails only when no valid Records remain. Clean local evidence when starting a fresh comparison:

```powershell
Remove-Item -Recurse -Force ./tmp/encounter-records
```

## Content Contract

| Type and home | Required authoring contract |
| --- | --- |
| Card: `resources/cards/` | `id`, `title`, complete `rules_text`, `speed` (`quick`/`slow`), `max_charge`, supported `target_type`, range for Minion targets, base effect fields, registered Keyword IDs, optional Charge Modifiers. The Top Card owns timing, target, and Charge Value. |
| Keyword: `resources/keywords/` | Stable `id`, display `title`, and one concise mechanical definition. Cards reference the ID in `tags`; a card contributes each distinct Keyword once to each matching modifier. |
| Charge Modifier: `resources/charge_modifiers/` | Stable identity/rules text, optional `keyword_id` (empty means every charged card), effect (`ARMOR`, `HEALING`, `BOSS_DAMAGE`, or `TARGET_DAMAGE`), and positive amount per match. It modifies the Top Card; the tucked card never resolves itself. |
| Boss Program / Beat: `resources/boss/programs/` | Program identity plus non-empty ordered Instant and Incoming rows. Every Beat has identity, rules text, visible counter tags, and fields required by its kind: damage, Hazard, Minion, duration, or count. Row membership is timing. |
| Hazard: `resources/hazards/` | Identity, duration, and at least one supported behavior: entry damage or voluntary-movement blocking. |
| Minion: `resources/minions/` | Identity, positive max health, and complete rules text. Boss Beats reference the Minion they spawn. New Minion triggers or attacks require engineering support. |
| Encounter: `resources/encounters/` | Hero/Boss identity, board radius and legal starts, health, Slots, refill target, complete deck, ordered Boss Programs, loop policy, Encounter Clock/enrage text, seed, and legal edge spawn candidates. Add it to `resources/content_catalog.tres`; select `default_encounter` to play it. |

Supported ordinary Card effects are Armor, healing, Boss damage, Presence, and ranged Minion damage. Supported Boss Beat kinds are the values exposed by `BossProgramBeat`. A new effect family, target family, trigger, board pattern, or Beat kind changes the rules engine and belongs to engineering.

## Complete Examples

- Keyword Charge Modifier Card: `resources/cards/tank/iron_guard.tres` references `resources/charge_modifiers/guard_armor.tres`, which counts the `guard` Keyword defined in `resources/keywords/guard.tres`.
- Telegraph and Hazard Beat: `resources/boss/programs/embermaw_embers.tres` authors Cinder Breath and references `resources/hazards/scorched.tres`; the engine derives the visible cone and applies that Hazard.
- Encounter sequence: `resources/encounters/embermaw_prototype.tres` provides the deck, three-program loop, starts, Whelp edge candidates, seed, and eight-Round Encounter Clock.

## Engineering Boundary

Design may freely tune existing fields, add Resources using supported types, reorder Beats, change deck composition, and change Encounter sequencing. Engineering owns new rules vocabulary, action kinds, target selectors, effect/trigger families, board query shapes, UI affordances, and schema changes. When validation says a behavior is unsupported, treat that as an engineering request rather than encoding the rule only in `rules_text`.

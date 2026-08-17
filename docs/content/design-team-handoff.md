# Design Team Handoff

The live authoring surface is the **Encounter Workbench** in `web/` (ADR 0019).
Every piece of gameplay content is JSON under the repo-level `data/` directory
(ADR 0020), validated by zod schemas at load. The Encounter Engine in
`web/src/engine/` is the rules source of truth; the Workbench renders it.

This build is ready for data-only iteration on Cards, Keywords, Charge
Modifiers, Statuses, Boss Programs and Beats, Hazards, Minions, and Encounters.
Ordinary content belongs in `data/`; do not edit the engine, the store, or the
board to tune content.

> The Godot reference under `resources/`, `scenes/`, and `scripts/` is frozen
> (D-018). Do not author there, and do not copy content out of it into an
> Encounter without re-checking it against the schemas below.

## Setup

```bash
cd web
npm install
npm run dev      # Workbench at http://localhost:5173, hot-reloads on data/ edits
```

Editing any file under `data/` reloads the running Workbench — the loader globs
the whole directory (`web/src/content/index.ts`), so a new file is picked up the
moment it is saved. There is no catalog or index file to register content in.

To play a build on a phone or iPad without a toolchain: push the branch and open
the deployed Workbench at <https://adrpadua.github.io/webgame/>. GitHub Pages
redeploys on every push to `main` or the active workbench branch that touches
`web/`, `data/`, or the workflow.

## Daily Workflow

1. Copy the closest existing JSON file in the matching `data/` directory.
2. Give it a stable lowercase `snake_case` `id` — the filename should match it —
   and complete player-facing `title` and `rules_text`.
3. Reference it by `id` from a Card, Boss Program, Encounter, or deck.
4. Validate and play:

```bash
npm test                 # schemas, cross-references, and engine rules
npm run lint             # includes the engine-purity boundary rule
npm run dev              # play the change
```

Before asking engineering to review a content batch, run the full gate:

```bash
npm run build && node scripts/smoke.mjs
```

`smoke.mjs` drives a real browser through the scripted first turn, an ordinary
round, Scenario replay, time travel, headless record verification, and a 390x844
portrait guard. On an image that ships its own Chromium, point it at the binary
with `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome`.

### Reading a validation failure

Errors name the file, the id, and every bad field:

```
Invalid card in data/cards/probe_bulwark.json — speed: Invalid option: expected one of "quick"|"slow"|"fast"; max_charge: Invalid input: expected number, received string
Duplicate keyword id "guard": defined in data/keywords/guard.json and again in data/keywords/guard_copy.json
Card probe_bulwark references unknown charge modifier steady_bonus
```

An unknown-reference error means the id is misspelled or the file it names does
not exist yet. A field error means the value is outside what the schema allows —
which is the engineering boundary talking, not a typo. See below.

## Balance Tooling

| Command | What it gives you |
| --- | --- |
| `npm run evaluate` | Headless sweep: fixed tank policies across seeded runs, aggregated to rubric-facing metrics. `-- --seeds 200`, `-- --policy turtle,stay,false`, `-- --json out.json`. Any **solo victory is reported as a RED FLAG** (D-016) — this is a team game, so a solo win means an over-rich economy or a dominant line, never a success. |
| `npm run headless -- --scenario <id>` | Plays a committed Scenario from `data/scenarios/` without a browser. |
| `npm run headless -- --replay <record.json>` | Verifies an Encounter Record by deterministic replay. |
| Debug rail (in the Workbench) | Scenario picker, seed control, time travel over the session timeline, live Resolution Fact log, and Scenario export. |

The seed is explicit everywhere: same seed plus same content equals the same
fight, every time. When comparing two tunings, hold the seed and change one
thing.

### Encounter Evidence

A completed Encounter writes a versioned **Encounter Record**
(`schema_version: 2`) — seed, content fingerprint, submitted and generated
actions, Resolution Facts, phase boundaries, outcome, and final snapshot. See
[../artifacts/encounter-records.md](../artifacts/encounter-records.md). Compare
results only within a fingerprint: a changed card means a changed fingerprint,
so old playthroughs are never silently mixed into a new tuning's numbers.

## Content Contract

Every field below is defined once, in `web/src/engine/content/schemas.ts`. That
file is the authority when this table and the code disagree.

| Type and home | Required authoring contract |
| --- | --- |
| Card: `data/cards/` | `id`, `title`, complete `rules_text`, `speed` (`quick`/`slow`), `max_charge`, `target_type` (`none`/`hex`/`board_slot`/`piece`), `range_tiles` for piece targets, effect fields, registered Keyword ids in `tags`, optional `charge_modifiers`, optional `applies_status`. `push_tiles` moves the target away from the firing Hero and `pull_tiles` moves it toward the Hero; either requires a piece target and range of at least 1, and one Card cannot declare both. The Top Card owns timing, target, and Charge Value. |
| Keyword: `data/keywords/` | Stable `id`, display `title`, one concise mechanical definition. Cards reference the id in `tags`; a card contributes each distinct Keyword once to each matching modifier. Set `role_marker: true` for a Keyword that only says which Role a card belongs to — the HUD leaves those off the glance surfaces. |
| Charge Modifier: `data/charge_modifiers/` | Stable identity and rules text, optional `keyword_id` (empty counts every charged card), `effect` (`armor`, `healing`, `boss_damage`, `target_damage`), and positive `amount_per_match`. It modifies the Top Card; a tucked card never resolves itself. |
| Status: `data/statuses/` | Identity, `applies_to` (`hero`/`enemy`), `triggers`, `stacking`, `duration_rounds`, and the enemy payload `damage_taken_bonus` / `damage_dealt_penalty`. A Card lands it through `applies_status`; where it lands comes from that Card's `target_type` — `none` on the firing Hero, `piece` on a selected Enemy, `board_slot` on an ally's Top Card. |
| Boss Program / Beat: `data/boss_programs/` | Program identity plus non-empty ordered `instant_beats` and `incoming_beats` — row membership is timing. Every Beat carries identity, rules text, visible `counter_tags`, a `consequence_tier` (`chip` anywhere, `structural` no later than Incoming, `severe` in the Forecast Row first — ADR 0026), and the fields its `kind` requires: `damage`, `unguarded_bonus`, `hazard`, `minion`, `count`, `duration_rounds`, `escalation_if_unanswered`. |
| Hazard: `data/hazards/` | Identity, `duration_rounds`, and at least one supported behavior: `enter_damage` or `blocks_voluntary_movement`. |
| Minion: `data/minions/` | Identity, positive `max_health`, `attack_damage`, and complete rules text. Boss Beats reference the Minion they spawn. New Minion triggers or movement rules require engineering. |
| Encounter: `data/encounters/` | Hero and Boss identity, `board_radius`, legal starts, health, `slot_count`, `hand_refill_target`, complete `player_deck`, ordered `boss_programs`, `loop_boss_programs`, `round_limit` and `enrage_text`, `random_seed`, `minion_spawn_candidates`, optional `phase_trigger` + `phase_two_programs` + `phase_break_text` (ADR 0023), and optional `escalation_thresholds` (ADR 0027). No new file to register — it appears in the Workbench's Encounter list on save. |
| Evaluation deck: `data/decks/` | Identity, the `encounter` it is played against, and a complete `player_deck`. Used by the balance tooling to compare decklists against one fight. |
| Scenario: `data/scenarios/` | Named, versioned action sequence replayed from a seeded initial state — never a state snapshot. Author these by exporting from the debug rail rather than by hand. |

Escalation Thresholds carry `boss_damage_bonus`, `extra_spawn_count`,
`minion_damage_bonus`, and `scorch_hexes` at values `1` through `4`. The wipe at
`5` is an engine rule, not content, so there is one authority for the end of the
fight. No authored `scorch_hexes` entry may sit adjacent to the Boss — the
Guarded Front has to stay standable, or Escalation removes the Tank's own
answer rather than raising the question. That is enforced at load, for every
Encounter, and the error names the file, the threshold, and the hex:

```
Encounter ashen_trial_variant (data/encounters/ashen_trial_variant.json) threshold 1 ("Ashen Verge") Scorches (1, 0), which is adjacent to the Boss at (1, -1) — the Guarded Front must stay standable
```

## Complete Examples

- **Keyword and Charge Modifier**: `data/cards/iron_guard.json` references
  `data/charge_modifiers/guard_armor.json`, which counts the `guard` Keyword
  defined in `data/keywords/guard.json`.
- **Telegraph and Hazard**: `data/boss_programs/embermaw_embers.json` authors
  Cinder Breath and references `data/hazards/scorched.json`; the engine derives
  the visible cone and applies the Hazard.
- **Status from a Card**: `data/statuses/sundered.json` is applied by a Card
  that declares `"applies_status": "sundered"` with `"target_type": "piece"`.
- **Forced Movement from a Card**: a Card with `"target_type": "piece"`,
  `"range_tiles": 2`, and `"push_tiles": 1` can shove a selected Whelp one
  hex away. Edge and occupancy stops are partial successes (ADR 0029).
- **A whole fight**: `data/encounters/embermaw_prototype.json` provides the deck,
  the three-program loop, starts, Whelp edge candidates, the Phase II trigger,
  four Escalation Thresholds, the seed, and the eight-Round Encounter Clock.

## Engineering Boundary

Design may freely: tune any existing field, add new files of the supported
types, reorder Beats, rewrite decklists, resequence Programs, add Escalation
Thresholds, and author whole new Encounters.

Engineering owns anything that widens the vocabulary, because each of these is a
closed set the engine switches on:

- **Card effects.** Armor (now and next round), healing, Boss damage, ranged
  target damage, Push, Pull, and applying one authored Status. Anything else —
  drawing a card, changing a cost, scaling off board state — is new engine
  code.
- **Boss Beat kinds.** `turn_toward_player`, `targeted_hit`,
  `hazard_last_impact`, `forward_cone`, `spawn_minions`, `warning`. A kind
  names the mechanic; the Beat's `title` and `rules_text` carry the Boss's
  flavour, and what varies between Bosses — `damage`, `hazard`, `minion`,
  `count` — is an authored field on the Beat.
- **Status triggers.** `on_round_start`, `on_enter_hex`, `on_damage_taken`,
  `on_slot_fired`.
- **Target families.** `none`, `hex`, `board_slot`, `piece`.
- **Charge Modifier effects.** `armor`, `healing`, `boss_damage`,
  `target_damage`.

When a rule you want cannot be expressed in a field, raise it as an engineering
request. Do not encode it in `rules_text` alone: the Detail Popup would promise
a behavior the engine does not resolve, and the Workbench's whole value is that
what a card says and what it does are the same thing.

### What the test suite pins

Tests assert that named content is **present** and still says what the rules
depend on — not how much content exists. Adding a card, keyword, status, or
Program never fails the suite on its own. Some assertions do pin specific
authored values for `embermaw_prototype` (its deck size, its Program order, its
seeded draws), because the engine tests play that exact fight; retuning it is
expected to require updating those expectations alongside the content.

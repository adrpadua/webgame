# Unified Keyword & Counter Catalog — Sketch

**Status: shipped in full (D-044 through D-047), minus one deliberate refusal.**

Live: one validated Keyword namespace with a `kind` discriminator (§3, §7), Counters with
`gate`/`scale`/`spend` Readers (§4–6), the `hex` and `slot` hosts, and event Keywords —
Readers that answer one kind of blow.

**§1's central claim was wrong and is corrected below.** Escalation is not this pattern and
did not become a Counter (D-046). That is the one piece of the plan that was dropped rather
than built, and dropping it was the finding.

Nothing in the live deck places or reads a Counter yet: the first card that does changes the
damage economy the D-016/D-017 walls were measured against, and owes the deck-evaluation gate
(backlog item 10). Every phase here was verified as byte-identical gameplay against the same
36-policy sweep for exactly that reason.

Where the shipped code differs from what a section first proposed, the section says so.

The goal: keywords become one validated namespace that everything joins on, and counters
become a general primitive that content reads — the SoTM model, where a passive says
"increase `fire` damage by 1" and the keyword is the join key rather than a label.

---

## 1. Why this is a consolidation, not a new system

The pattern already exists three times, in three shapes, none of them sharing code:

| Existing | Host | Reader | Scoping |
| --- | --- | --- | --- |
| Escalation | Encounter | `escalationThresholds` — "every threshold at or below the value is live" | none |
| Charge Modifiers | Charge stack | `amount_per_match` per matching card | **by keyword** (`keyword_id`) |
| Status Effects | Combatant | payload welded onto the marker | none |

> **Correction (D-046).** Escalation belongs on this list for its *counting* and not for its
> *reading*, and the difference turned out to be the whole argument. Building Phase 2 made it
> concrete: of Embermaw's four live thresholds, two are `scorch_hexes` — a one-shot board
> mutation on crossing — one is `extra_spawn_count`, which changes how many Whelps a Beat
> summons, and one is `minion_damage_bonus`, which modifies every Minion rather than a host.
> None is a `per`-count modifier, and none of their effects exists in the four-value enum
> Readers share with Charge Modifiers. Converting Escalation would mean widening `effect`,
> adding a subject like "every Minion" to `on`, and inventing on-crossing semantics —
> three concessions to absorb one mechanic that was already working. Escalation stays as it
> is, and `encounter` is not a Counter host.

`cardResolver.ts:20` is already the SoTM move, written once:

```ts
chargeStack.filter((card) => card.tags.includes(modifier.keyword_id)).length
```

Rule of three. The abstraction is earned, not speculative.

## 2. The problem this fixes first

There are four tag vocabularies today and only one is validated:

| Vocabulary | Schema | Validated | Load-bearing |
| --- | --- | --- | --- |
| `card.tags` | `z.array(z.string())` | ✅ against `keywords` | Charge Modifier matching |
| `beat.damage_classification` | `z.string()` | ❌ | **Yes — gates Riposte Ready** |
| `beat.target_selector` | `z.string()` | ❌ | Yes — Beat targeting |
| `beat.counter_tags` | `z.array(z.string())` | ❌ | Forecast Row display |

`damage_classification` is the sharp one. It is SoTM's damage-type layer, it is unvalidated
free text, `resolve.ts:761` gates a status grant on it equalling `'tank_hit'`, and its sibling
value `'raid_hit'` is **hardcoded in `advancePhase.ts:125` and appears nowhere in `data/`**.
A typo silently disables Riposte Ready with no error at load and no failing test.

`target_selector: "tank"` is the same story inverted: `"tank"` *is* a keyword id
(`data/keywords/tank.json`), used as a selector in a field with no link to the keyword
catalog. The join already exists as a coincidence of spelling.

---

## 3. Keywords — one namespace, one discriminator

Keywords stay **pure identity**. They never carry behaviour. The moment `guard.json` grows a
mechanical field, D-034's mistake — payload welded to the marker — has been reinvented one
level up, where it is much harder to unpick.

```ts
export const keywordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  // One namespace so anything can join on anything, one discriminator so the
  // validator can still reject a category error. `damage_classification:
  // "guard"` is spelled correctly and still nonsense.
  kind: z.enum(['role', 'trait', 'damage_type', 'answer']),
})
```

```jsonc
// data/keywords/tank_hit.json — was an unvalidated string in two places
{ "id": "tank_hit", "title": "Tank Hit", "kind": "damage_type",
  "rules_text": "A Boss blow aimed at the Party's front-line Hero." }

// data/keywords/kill_adds.json — was the Title Case display label "Kill Adds"
{ "id": "kill_adds", "title": "Kill Adds", "kind": "answer" }
```

Two notes on what shipped versus what this section first proposed:

- **`role_marker` is gone**, derived from `kind === 'role'`. Being a Role is the whole reason
  a Role Keyword is left off the glance surfaces, so the two were never independent facts.
- **`archetype` is not in the enum.** Nothing places or reads an archetype Keyword yet, and
  §7's reachability rule says a dead vocabulary entry should not ship. It arrives with the
  first content that needs it.

`kind` is required, with no default: a Keyword that cannot say what sort of thing it is
cannot be checked against anything.

Every free string above becomes a validated reference:

```ts
damage_classification: z.string().default(''),   // → validated, kind: 'damage_type'
target_selector:       z.string().default(''),   // → validated, kind: 'role'
counter_tags:          z.array(z.string()),      // → validated, kind: 'answer'
```

`'raid_hit'` moves out of `advancePhase.ts` and into `data/keywords/raid_hit.json`.

---

## 4. Counters — identity, host, bounds. No payload.

A counter is a named, counted marker. It does nothing on its own; content reads it. This is
the YGO Spell Counter model, and it is what makes counters archetype-scoped by convention
rather than by mechanism.

```ts
export const counterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  rules_text: z.string().default(''),
  keywords: z.array(z.string()).default([]),
  // Every bespoke counter in the codebase today, generalised: Escalation is
  // `encounter`, a Hazard-like mark is `hex`, D-035's unbuilt ally-Top-Card
  // attachment is `slot`.
  host: z.enum(['combatant', 'hex', 'slot', 'encounter']),
  max: z.number().int().min(1).default(1),
  // 0 = no clock; it sits until something spends it. The alternative to a
  // countdown, and the more interesting axis.
  duration_rounds: z.number().int().min(0).default(0),
})
```

```jsonc
// data/counters/ash.json
{ "id": "ash", "title": "Ash", "keywords": ["fire", "embermaw"],
  "host": "combatant", "max": 5, "duration_rounds": 0,
  "rules_text": "Embermaw's cinders cling to what they touch." }
```

**Statuses become counters with `max: 1` plus readers** (§6), which is where the D-034
reversal actually lands.

---

## 5. Readers — three verbs, deliberately not a language

A reader is the join. It hangs off a card, a Beat, or a counter, and it is the *only* way
anything reads game state declaratively.

```ts
const readerSchema = z.object({
  // gate: refuse unless the count qualifies.
  // scale: amount per counter.
  // spend: remove counters.
  verb: z.enum(['gate', 'scale', 'spend']),

  // Exactly one of these. `counter` names one; `counter_keyword` matches any
  // counter carrying that keyword — `guard_armor`'s pattern generalised, and
  // the thing that makes "for each fire counter" authorable.
  counter: z.string().default(''),
  counter_keyword: z.string().default(''),

  // A closed set of subjects. Not a path expression — the whole point.
  on: z.enum(['self', 'source', 'target', 'encounter']).default('target'),

  // Reuses the existing effect enum. No new effect vocabulary is introduced.
  effect: z.enum(['armor', 'healing', 'boss_damage', 'target_damage']).optional(),

  at_least: z.number().int().min(1).optional(),  // gate
  per:      z.number().int().min(1).optional(),  // scale
  amount:   z.number().int().min(1).optional(),  // spend

  // The distinction that makes counters feel like a resource rather than a
  // stat: a cost is paid on activation and is not refunded if the effect
  // fizzles. Neither Escalation nor Charge Modifiers has this today.
  timing: z.enum(['cost', 'resolution']).default('resolution'),
})
```

```jsonc
// "Remove 3 Ash from the target: deal 6." — gate + spend + flat damage
"reads": [
  { "verb": "gate",  "counter": "ash", "on": "target", "at_least": 3 },
  { "verb": "spend", "counter": "ash", "on": "target", "amount": 3, "timing": "cost" }
]

// "Deals 1 more damage for each fire counter on the target."
"reads": [
  { "verb": "scale", "counter_keyword": "fire", "on": "target",
    "effect": "target_damage", "per": 1 }
]
```

### The stop line

**No boolean composition, ever.** Multiple `gate` entries AND implicitly. There is no `or`,
no nesting, no negation. A reader may only ask about *counters* — never about arbitrary
state. `{counter: 'ash', at_least: 3}` is safe forever; the moment `{and: [...]}` is wanted,
an interpreter is being written and ADR 0020's "schema-validated JSON" has stopped
describing what is in `data/`.

If a mechanic genuinely needs composition, it becomes a Beat kind or engine code — the
existing escape hatch — not a richer JSON grammar.

---

## 6. What statuses become

`applies_to`, `damage_taken_bonus`, and `damage_dealt_penalty` all disappear. The side a
status is written for stops being declared and starts being *implied* by what its readers do.

```jsonc
// data/counters/sundered.json — was data/statuses/sundered.json
{
  "id": "sundered", "title": "Sundered", "keywords": ["debuff"],
  "host": "combatant", "max": 1, "duration_rounds": 1,
  "rules_text": "This Enemy takes 1 more damage from every source.",
  "readers": [
    { "when": "host_takes_damage", "verb": "scale",
      "counter": "sundered", "on": "self", "effect": "target_damage", "per": 1 }
  ]
}
```

```ts
when: z.enum([
  'round_start',
  'host_takes_damage',
  'host_deals_damage',   // new — see below
  'host_enters_hex',
  'slot_fired',
])
```

This fixes two live authoring traps as a side effect:

- **`on_enter_hex` is declared and never read.** It is in the schema enum and the TS union,
  and nothing consumes it. Authoring it today produces a status that silently does nothing.
- **`damageDealtPenalty` is gated on the `on_damage_taken` trigger.** `statusSum` filters
  both fields by the same trigger, so a status about *dealing* damage only works if authored
  as *taking* damage. `weakened.json` does exactly this; it reads as a typo and is
  load-bearing. With `host_deals_damage` as a real trigger, the trap closes.

Riposte Ready's graded consumption (D-015) does **not** fit this vocabulary and should stay
engine code, exactly as D-033 decided. Its grant condition can still become a keyword query
(`damage_classification` matching the `tank_hit` keyword) instead of a TS constant.

---

## 7. What the validator gains

Beyond the existing "unknown id" checks:

1. **Kind mismatch** — `damage_classification: "guard"` is a category error.
2. **Unknown counter in a reader.**
3. **Reachability** — a counter placed by nothing, or read by nothing, fails the build.
   This is the lint that makes "counters can be arbitrary" safe rather than unbounded: the
   counters can be anything, but a dead one cannot ship.
4. **Verb/field coherence** — `scale` without `per`, `gate` without `at_least`.

(3) is the one worth building even if nothing else here happens.

---

## 8. Migration order

**Phase 0 — shipped (D-044).** `damage_classification`, `target_selector`, and
`counter_tags` are keyword references validated by id and by kind; `raid_hit` is authored in
`data/keywords/`; `role_marker` is gone, derived from `kind === 'role'`; `ENGINE_KEYWORDS`
asserts at load that every Keyword the rules name by id exists as the right kind. Gameplay
bit-identical — the smoke's replay fingerprint is unchanged.

**Phase 1 — shipped (D-045).** Counters replace Status Effects outright: `data/statuses/`
is now `data/counters/`, D-034's `damage_taken_bonus`/`damage_dealt_penalty` and the
`applies_to`/`stacking` fields are gone, and cards carry `places_counter`/`counter_amount`
plus a `reads` list. Fortified went too — its banked Armor is the count, so D-019's additive
stacking is addition. Riposte Ready stays engine-built. Gameplay identical: the 36-policy
evaluation sweep is byte-identical to the pre-change run across every metric.

Two things the sketch got wrong, found by building it:

- **`per` has to be signed.** §5 proposed `min(1)`. Weakened is `-1`; a debuff needs it.
- **`spend` cannot take a `counter_keyword`.** "Remove 3 of any fire Counter" makes the rules
  choose which, and a rule that chooses for the player cannot be planned against. `gate` and
  `scale` still match by Keyword; only `spend` is restricted.

And one the sketch was right about but overstated: §7's reachability lint ships **read-side
only**. A Counter nothing reads fails the build. A Counter nothing *places* does not, because
Sundered and Weakened are exactly that while they wait on the deck-evaluation gate (backlog
item 10) — enforcing it would delete authored content to satisfy a lint.

**Phase 2 — shipped (D-046), minus Escalation.** `hex` and `slot` hosts are live, and
Counters are keyed by a branded tagged ref (`combatant:<id>`, `hex:<q,r>`, `slot:<hero>:<n>`)
rather than by entity id — one map, one upkeep, and a ref that can answer "is the host still
there?" without knowing what kind it is. D-035's `board_slot` attachment is reachable at
last; a Slot Counter rides the prepared card, so re-loading the Slot drops it. A Counter's
`host` and its card's `target_type` must agree, and non-combatant hosts may declare no
Readers, because every `when` in the vocabulary names a combatant's event. Escalation stays
put — see the correction in §1.

**Phase 3 — shipped (D-047).** Damage carries Keywords, and a Reader may name one
`event_keyword` to answer only blows carrying it. Two corrections to what this section
assumed:

- **The Keywords had to go plural.** `damage_classification` was one string, and "who a blow
  is aimed at" and "what it is made of" are two axes — a blow can be a Tank Hit *and* fire.
  One field holding both is the category error §3's `kind` discriminator exists to prevent,
  so Beats and Cards now carry `damage_keywords`.
- **Cards had to carry them too.** Only Boss Beats classified their damage, so an
  event-Keyword Reader would have worked in one direction only: the party could be warded
  against a Whelp's bite but could never throw anything a Counter could answer. "This phase
  just types them" was true of the Boss side and false of the party's.

---

## 9. Known costs

**A counter's meaning is the set of things that read it.** Sundered self-describes and the
hold popup quotes `rules_text`. Ash means nothing alone, so the Stat Panel has to *derive*
"Ash 3 — spent by Cinder Reap (3), Ashfall Pact (5)." That is real UI work, and it is
precisely where YGO fails new players — it gets away with it because the card text is
physically in hand. The Stat Panel has no such excuse.

**Resolution Fact legibility.** D-034 chose named fields partly to keep facts readable for
the evaluation harness. Every `gate`/`scale`/`spend` must emit a fact or that argument wins.
Done properly it is arguably *better*: `counter_spent{ash, 3}` beats a diffuse damage bonus.

**Authoring density.** Card JSON grows a nested `reads` array. Still schema-validated JSON,
so ADR 0020 holds, but a card stops being a flat sheet of numbers.

---

## 10. Open questions

1. **Are counters and statuses one concept or two?** This sketch merges them (`max: 1` +
   readers). The argument against: a status has a *duration* and a counter has a *count*, and
   merging means every counter carries fields most of them ignore.
2. **`archetype` as a keyword kind, or a separate field?** As a keyword it is uniform and
   queryable; as a field it is enforceable ("Aegis cards may not read Embermaw counters").
   YGO deliberately allows generic cards to touch archetype counters, which argues for
   keyword.
3. **Does `scale` need a cap?** "For each Ash" with `max: 5` is bounded by the counter; with
   `counter_keyword` across several counter types it is not.

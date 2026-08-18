# Unified Keyword & Counter Catalog — Sketch

**Status: sketch, not adopted.** No decision-log entry, no schema changes. This exists to
make the shape arguable. It proposes reversing part of D-034, so adopting any of it owes a
decision entry.

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
  kind: z.enum(['role', 'damage_type', 'answer', 'archetype', 'trait']),
  // Existing: a Keyword that marks Role rather than behaviour, left off glance
  // surfaces because every card in a Hero's deck carries theirs.
  role_marker: z.boolean().default(false),
})
```

```jsonc
// data/keywords/tank_hit.json — was an unvalidated string in two places
{ "id": "tank_hit", "title": "Tank Hit", "kind": "damage_type",
  "rules_text": "A Boss blow aimed at the Party's front-line Hero." }

// data/keywords/kill_adds.json — was the Title Case display label "Kill Adds"
{ "id": "kill_adds", "title": "Kill Adds", "kind": "answer" }

// data/keywords/embermaw.json — archetype scoping is just a keyword
{ "id": "embermaw", "title": "Embermaw", "kind": "archetype" }
```

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

**Phase 0 — no design risk, do regardless.** Promote `damage_classification`,
`target_selector`, and `counter_tags` into the keyword catalog with `kind`; move `raid_hit`
out of engine code; add kind validation. Kills the silent-typo failure that can currently
disable Riposte Ready. Touches no gameplay.

**Phase 1.** Counters + `gate`/`scale`/`spend`, `host: combatant` only. Port `sundered` and
`weakened` off named fields onto readers. Reversal of D-034 — owes a decision entry.

**Phase 2.** Other hosts. Escalation becomes a counter with threshold readers; D-035's
`board_slot` attachment becomes reachable.

**Phase 3.** Event keywords — passives that read the *fact stream* rather than entity state
("increase `fire` damage dealt by 1"). Resolution Facts already carry `damage_classification`,
so the events are already keyworded; this phase just types them.

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

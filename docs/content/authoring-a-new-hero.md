# Authoring a New Hero

The end-to-end path from "we want a second Hero" to a playable, measured fight,
using only the supported authoring surface. Elian Voss is the worked example
throughout — every step names the live file that already does what the step
describes. The companion contract table and validation guide live in
[design-team-handoff.md](design-team-handoff.md); this document is the order to
do things in and where each decision is recorded.

A Hero is first-class authored content (ADR 0034): identity, health pool, and
the printed Signature live in one file under `data/heroes/`, and an Encounter
fields the Hero by id. Nothing about creating one requires touching engine
code — until you reach the Signature's earn condition, which has a closed
vocabulary and its own escalation path (step 5).

## 0. Design before data

Two documents gate whether the Hero should exist at all:

- [character-design-bible.md](../rules/character-design-bible.md) — the Hero
  Design Contract table (raid job, Signature, engine nouns, setup, conversion,
  payoff, recovery, spatial expression, counterpressure). Every element wants a
  named answer before the deck grows past a teaching slice.
- The **Second Hero Of A Role** rule in the same document: a second Hero of an
  existing role must claim a distinct strength-and-price pattern. Elian holds
  the Warden pattern; [kessa-varn-design.md](heroes/kessa-varn-design.md) is
  the worked example of claiming the Vanguard pattern next to him.

Write the design doc first, as `docs/content/heroes/<hero-slug>-design.md`,
following the shape of [elian-voss-design.md](heroes/elian-voss-design.md).
Record the adoption decision in
[design-decision-log.md](design-decision-log.md) with `D-NEW` in the ID column
(`cd web && npm run log:ids -- --fix` assigns the number).

## 1. The Hero file

```bash
cd web
npm run scaffold -- hero kessa_varn "Kessa Varn"
```

That writes `data/heroes/kessa_varn.json` from the
[template](templates/README.md): `id`, `title`, `rules_text` (one sentence
naming the raid job), `max_health`, and an empty `signature_card`. The id is
stable forever — the display title can change, the id cannot, and the filename
matches it.

The Hero deliberately carries no Role field: every card in their deck will
carry the Role Keyword, and `heroRole` reads it back out of the deck. The Hero
also carries nothing the *fight* decides — start hex, deck list, Slot count,
and hand refill all stay on the Encounter.

## 2. Keywords

The Hero's deck needs a `role` Keyword (Elian's is `tank`), and the machine
usually wants one or two `trait` Keywords for Charge Modifiers to count
(Elian's `guard`). Scaffold each:

```bash
npm run scaffold -- keyword vanguard
```

Set `kind` deliberately — every reference is checked against it, and the
categories are `role`, `trait`, `damage_type`, and `answer`.

## 3. The deck

Scaffold each card and author it against
[player-card-authoring.md](../rules/player-card-authoring.md): base effect
first, encounter-neutral targets, no promised behavior the data fields do not
carry. Every card in the deck carries the Hero's Role Keyword in `tags` —
that unanimity is what names the Role.

The effect vocabulary is a closed set (Armor, healing, Boss damage, ranged
target damage, Burst, Push/Pull, draw, placing a Counter, reading Counters).
A card idea that does not fit a field is an **engineering request**, never a
`rules_text` promise — see the boundary section of the handoff doc.

Charge Modifiers (`data/charge_modifiers/`) are where the tuck-versus-fire
tension comes from; give the machine at least one modifier that counts its
trait Keyword, the way `guard_armor` counts `guard`.

## 4. Counters, if the machine needs them

If the Hero's engine nouns include a countable thing (banked Armor, a mark on
the Boss), author it as a Counter with Readers
(`npm run scaffold -- counter <id>`), and prefer *reading an existing Counter*
over authoring a near-duplicate — a second Sundered with different words is how
the shared vocabulary stops being shared.

## 5. The Signature

The Signature is a card with `fixed: true`, named by the **Hero file's**
`signature_card`. Scaffold it as a card and author, per the contract table:

- `standing`: the Grants that earn Charges. Each names a `when` from the
  closed event set, optionally an `event_keyword`, and `gates` that must all
  pass.
- `full_charge`: the optional fired-at-cap rider (Elian's places `Sundered`).
- `resource_title`: what the Hero Frame calls the earned Charges ("Ripostes",
  "Momentum").
- `target_type` must be `none` — the Signature button carries no targeting
  flow.

**Here is the one wall.** The gate list is a closed set, and today it holds
exactly two predicates: `health_loss_zero` (the perfect block) and
`guarded_front` (the Warden sentence). Both are Elian-shaped. A new Hero
pattern almost by definition wants a new earn condition — Kessa's Momentum
earn is exactly this — and a new gate is engine code, because a gate is a
computation over board state, not a field.

Raise it as an engineering request the way the game-design agent contract
specifies: player value, scope, non-goals, and acceptance evidence. The
request is small and well-precedented — a gate is one predicate in
`web/src/engine/signature.ts` plus one enum entry — but it is engineering's to
make. Do not ship the Hero with a borrowed gate that misstates their job; a
Signature whose earn condition does not restate the raid job fails the design
contract's first test.

## 6. An Encounter that fields the Hero

A Hero becomes playable the moment an Encounter names them:

```bash
npm run scaffold -- encounter kessa_proving
```

Point `hero` at the new id and `player_deck` at the new cards. **Reuse the
Embermaw Boss Programs for the first fight** — `boss_programs` can name
`embermaw_hunt`, `embermaw_embers`, `embermaw_brood` directly, which gets the
new Hero on a board against proven pressure without authoring a Boss first.
Set `fields_signature: false` if the Signature is not ready; the Hero fields
without it.

The engine is still solo, one Hero per Encounter: a Hero whose design needs a
party (Kessa's `Breach` window) can be authored and fielded solo, with the
party half held in `Later` the way her design doc does it.

## 7. Evidence

- `npm test` — schemas and cross-references; every dangling id is named.
- `npm run dev` — play it; the Workbench hot-reloads on every `data/` save.
- `npm run scaffold -- deck <id>` + `npm run evaluate -- --deck <id>` — the
  automatic half of the [deck-evaluation-rubric](deck-evaluation-rubric.md).
  Caveat: the sweep's built-in policies are tank lines; expect to read the
  raw metrics rather than the policy names for a non-tank Hero, and treat a
  **solo victory as the red flag it is** (D-016).
- Export Scenarios from the debug rail for the lines you tune against, and
  compare Encounter Records only within one content fingerprint — retuning
  the Hero file itself (health, Signature) starts a new cohort.
- `npm run verify:local` before handing the batch to engineering review.

## 8. Art

Generation order and templates: [art-prompts/README.md](art-prompts/README.md).
The Hero concept sheet comes first and anchors everything else; attach
`elian-voss-clean-concept.png` so the roster reads as one game. Note the
standing freeze: finished card art is **banked, not wired** — commit it under
`assets/art/` and stop. Board sprite sheets additionally need an engineering
step (`web/src/board/sheets.ts` is a hardcoded table), so treat a new Hero's
board piece as an engineering request alongside the sheet.

## What still requires engineering, by name

| Want | Why it is engine code | Precedent to cite |
| --- | --- | --- |
| A new Signature gate (earn condition) | Gates are predicates over board state; the enum and its evaluation live in `web/src/engine/signature.ts` | D-064 shipped `health_loss_zero`, `guarded_front` |
| A new card effect, target family, Beat kind, Status trigger, or Charge Modifier effect | Closed sets the engine switches on | Handoff doc, Engineering Boundary |
| A class resource that is not the Signature's Charge bank | Only the Signature Slot's earned Charges exist as a resource today | Kessa's Momentum is the named waiting case |
| A second Hero on the board at once | Multi-Hero party model, Engineering backlog rank 6 | [design-backlog.md](design-backlog.md) |
| The Hero's board sprite | `sheets.ts` is a hand-measured table, one entry per piece | Board sprite prompts are still bankable now |

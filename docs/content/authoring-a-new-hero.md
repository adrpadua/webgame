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

### Check the seams before you author anything

**Then read your own design doc back, looking for mechanics the engine does
not have yet.** If the kit depends on a missing seam, authoring it as a
degraded proxy built from the fields that do exist is a mistake with a name —
the Kled lesson — and [kessa-varn-design.md](heroes/kessa-varn-design.md)
states the rule for its own kit: *do not author `data/` card definitions for
this list until the seams land*, because proxy content does not express the
fantasy and poisons play-feel evidence. A Hero blocked this way is a set of
engineering requests, not a `data/` batch.

Two checks catch almost every case:

- **The earn condition.** A Signature may fire on any of the four events
  since ADR 0037 — being hit, landing a blow, firing a Slot, or the Round
  start — but each event carries only the gates it can answer. Step 5 has the
  pairings.
- **The effect vocabulary.** Every card effect, Beat kind, target family, and
  Charge Modifier effect is a closed set, listed in the handoff doc's
  Engineering Boundary. A card that needs a new one is a request.

A Hero whose design clears both checks is fully authorable today. One that
does not is still worth designing — file the requests and author what is
unblocked, which is usually the deck.

## 1. The Hero file

```bash
cd web
npm run scaffold -- hero kessa "Kessa"
```

That writes `data/heroes/kessa.json` from the
[template](templates/README.md): `id`, `title`, `full_name`, `rules_text` (one
sentence naming the raid job), `max_health`, and an empty `signature_card`. The
id is stable forever — the filename matches it, and nothing renames it because
a name would read better.

**A Hero is addressed by first name.** `title` is the first name and nothing
else — `Elian`, `Maren`, `Kessa` — because it is the string every readout
prints: the Hero Frame, the ally frames, every aria-label. The id is that same
word lowercased, so a Scenario step reads as the person it names. The name on
the character sheet goes in `full_name` — `Captain Elian Voss` — where it is
flavour a hold can tell rather than a label a 208px frame has to truncate.

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

**The earn vocabulary is now open, but each event carries only the gates it
can answer** (ADR 0037):

| `when` | What earns the Charge | Gates it may carry |
| --- | --- | --- |
| `host_takes_damage` | The Hero is hit | `health_loss_zero`, `guarded_front` |
| `host_deals_damage` | The Hero lands a blow | `effect_landed` |
| `slot_fired` | The Hero fires a Slot | `effect_landed` |
| `counter_spent` | The Hero's `spend` verb takes a Counter off | none |
| `round_start` | The Round begins | none |

`effect_landed` asks whether the event actually did something — a blow that
cost health, or a fire that produced damage, Armor, healing, banked Armor, a
Counter, or a Counter spent off a host. Gate a `slot_fired` or
`host_deals_damage` earn on it unless you have a reason not to: without it the
earn is farmable by firing an empty Slot at nothing, which makes it a
formality rather than a reward for correct play.

`counter_spent` takes no gates because it does not need one: it is raised only
where a `spend` Reader actually removed at least one Counter, so a spend that
found nothing raises nothing and there is no empty fire to farm. It is raised
once per such Reader, which makes it the earn to reach for when a Hero's job
is removing something the Boss put there — Maren's Underwriting charges off
striking a Sear off a record (D-102).

A gate paired with an event it cannot answer is refused at load, and so is an
`event_keyword` on `slot_fired`, `counter_spent`, or `round_start`, because
those events carry no damage Keywords to narrow by:

```
Card probe_sig gates a round_start standing clause on health_loss_zero,
which that event cannot answer; round_start takes no gates
```

A Hero whose earn condition needs something outside this vocabulary — a
counted class resource with its own decay, say — still files a request, and
should be authored with `signature_card` empty in the meantime. Kessa Varn's
Momentum is the standing example: ADR 0037 was deliberately scoped narrower
than her resource, because whatever that resource turns out to be, its
Signature first had to be able to name the event that earns it.

## 6. An Encounter that fields the Hero

A Hero becomes playable the moment an Encounter names them:

```bash
npm run scaffold -- encounter kessa_proving
```

Point the Encounter's `party` at the new Hero — one seat per Hero, each with a
`hero` id, a `start` hex, and its own `deck` (ADR 0035) — and remember that a
seat's deck is what states that Hero's Role, so two seats sharing one decklist
are two seats with the same Role. **Reuse the
Embermaw Boss Programs for the first fight** — `boss_programs` can name
`embermaw_hunt`, `embermaw_embers`, `embermaw_brood` directly, which gets the
new Hero on a board against proven pressure without authoring a Boss first.
Set `fields_signature: false` on the seat if the Signature is not ready; the
Hero fields without it.

A Party of up to four is authorable since ADR 0035, and a card may reach an
ally (`target_type: "ally"`), which is what makes a preservation Hero
expressible at all. Two things are still missing: **Downed/Revive** — any Hero
reaching zero still ends the Encounter, so a failed save is a loss rather than
a recoverable mistake — and the **party UI**, so a second seat is playable
through tests and the headless runner rather than the Workbench today.

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
| A Signature that earns on an event outside the four | The earn vocabulary is the event registry's grant rows (ADR 0037, ADR 0041); a new event is a registry row plus its raise site, never a schema edit alone | Shipped precedent: D-071 opened all four `when`s; the request that drove it is [signature-earn-vocabulary.md](design-proposals/signature-earn-vocabulary.md) |
| A new Signature gate | Gates are predicates over board state; the enum and its evaluation live in `web/src/engine/signature.ts` | D-064 shipped `health_loss_zero`, `guarded_front` |
| A new card effect, target family, Beat kind, Status trigger, or Charge Modifier effect | Closed sets the engine switches on | Handoff doc, Engineering Boundary |
| A class resource that is not the Signature's Charge bank | Only the Signature Slot's earned Charges exist as a resource today | Kessa's Momentum is the named waiting case |
| A second Hero on the board at once | Multi-Hero party model, Engineering backlog rank 6 | [design-backlog.md](design-backlog.md) |
| The Hero's board sprite | `sheets.ts` is a hand-measured table, one entry per piece | Board sprite prompts are still bankable now |

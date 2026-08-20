# Maren Tallis: Restorative Healer

Status: character design adopted (D-080) and implemented — Maren, her Signature, and the twenty-card deck are authored content, and `embermaw_attrition_trial` seats her (D-083). This document defines content intent and rules contracts against the authored attrition gate (D-082). It does not authorize UI-only behavior or unsupported card text.

## Character Promise

Maren Tallis is the MMO-familiar restorative Healer: keep the Party's count of the living complete, remove the marks the Boss leaves on people, and turn a correct read of the Timeline into the Party's extra damage.

The Restorative should feel precise, unhurried, and better-informed than anyone else at the table. She should not feel like a damage dealer with a green palette, a passive aura, or a repair treadmill.

## Identity

**Name:** Registrar Maren Tallis\
**Pronouns:** she/her\
**Title:** The Living Count

Maren is a Witness Registry-certified registrar-medic of the **Meridian Concord**, raised on the signal barges of the Meridian Rivers, where every family keeps a ledger and every ledger is a promise. In Meridian law, many gates cannot close until the **Civic Count** is known — the verified count of living, missing, dead, and evacuated. Maren's discipline is the count kept *during* the disaster: moving down an evacuation line with a Medicant Rig on her back, certifying who still breathes, and refusing to let the number change.

Her survivor-given title inverts the Registry's grim arithmetic. A count is normally finished when everyone is accounted for; Maren's count is finished when everyone on it is alive. "The count is not done," she says, closing a wound with one hand and a ledger clasp with the other, "until it stops changing for the wrong reasons."

### Story Spine

Maren was a junior registrar during a flood-season collapse at a canal town whose name she will not say. Protocol ordered her to certify the missing and transfer the count to the next watch. She refused the transfer, went back over the wall with a borrowed Medicant Rig, and returned with four names moved from *missing* to *living* — and one moved to *dead* because she arrived late. The Registry disciplined her for the refusal and certified all five entries. Both facts are on her record. She keeps it that way on purpose.

The Concord's shadow — slow to act when no protocol fits, preserving records while people need improvisation — is the thing Maren pushes against from inside. She does not break protocol; she finishes it faster than it was written to go. Her raid work is the same argument continued: raid bosses are disasters with intent, and a raid Party is an evacuation line of exactly four names.

### The Medicant Rig

Aether-ceramic braces, restorative glyphs, and stabilizing vessels (see the lore dictionary): a recovery protocol with a body, not a staff caster. Maren's Rig reads as civic equipment under pressure — clasps, gauges, numbered vials, signal-cloth tabs, a ledger spine down one brace. Healing is administered, recorded, and certified; nothing about it glows softly.

### Card-Story Fit

- Heals are *procedures*: braced, dosed, countersigned.
- Cleansing is *striking a false entry*: the Boss wrote something on a Hero's record, and Maren removes it.
- Overflow conversion is *the count turned outward*: care beyond what a body can hold is discharged at the thing causing the casualties.
- The Signature is *underwriting*: the Registry certifies a rescue claim before the blow lands.

## Design Language

**Mechanical language:** she is the information-advantage Hero. Every strong Maren play names a future event — the Beat an overheal is banked against, the mark that will price the next hit, the ally the Signature covers. A Maren turn that only reacts to the previous Beat is a weak turn by design.

**Visual language:** Meridian signal-cloth trims, ledger hardware, water-stained ceramics. Palette against Elian's oathsteel blues: Meridian greens and bleached ceramic white, per the accepted concept art (2026-08-20, banked under `assets/art/characters/maren-tallis/`) — she carries a branching staff whose crown holds a green stabilizing vessel, the Medicant Rig's field form. *Revised from the original river-silt reds when the concept was accepted; the reds survive as accent trim if the art pass wants them.*

**Tone:** procedural warmth. She is not gentle; she is *thorough*, and the thoroughness is the kindness.

## Core Loop

1. **Read** the Timeline: who does the Incoming Row name, and who carries a Sear?
2. **Cover** — heal the wounded, or deliberately overheal the Hero about to be hit, converting the surplus into Boss damage (the `overflow` Keyword, D-080).
3. **Clear** — spend a cleansing card to remove a Boss-placed mark before it prices another blow.
4. **Bank** — converted overflow charges the Signature (`host_deals_damage` + `effect_landed`); at the right moment, spend all Charges to underwrite one ally, turning their next incoming blow into healing. At full bank, a second ally is underwritten.

## Settled Rules

| Rule | Value | Source |
| --- | --- | --- |
| `max_health` | 18 — provisional until the no-healer-clear line is played | Q16 / D-080 |
| Role / Archetype | Healer / Restorative | D-080 |
| Damage cards | None. All Boss damage is converted overflow or the Signature. | Healer Principle 3 |
| Overflow conversion | 1:1 into Boss damage, capped at the card's printed healing | Q21 |
| Conversion carrier | The `overflow` Keyword (trait) on the card, read by one engine rule — never a global rule, never per-card text | Q14 |
| Cleansing | Existing `spend` verb on `target_type: "ally"` cards — no new verb | Q11 |
| Signature earn | `host_deals_damage`, gated `effect_landed`, +1 Charge | Q9 |
| Signature bank | `max_charge: 2`; spend all; `full_charge` extends the cover to a second ally | Q23 |
| Signature effect | Pre-emptive: the covered ally's next incoming blow converts to healing | Q20 |
| Deck skeleton | 20 cards; the paper White Mage's size, Fast/Slow mix, and range conventions; its five damage cards replaced by three overflow carriers and two cleansing cards | Q5 / Q19 |

## Deck Plan (families, not cards)

| Family | Count | Notes |
| --- | --- | --- |
| Single-target heals | 7 | 3 light/Quick, 3 medium/Slow, 1 heavy/Slow — the paper skeleton |
| Area heals | 3 | Self-centred radius-1 burst, per the paper Radial pattern |
| Overflow carriers | 3 | Heals carrying the `overflow` Keyword — her damage game |
| Cleansing | 2 | `spend` the Boss-placed mark on a chosen ally; the paper Dispel is the first |
| Utility | 5 | Draw, ally repositioning, movement, and the rescue support family |

Card authoring is the next step after this document and follows [../../rules/player-card-authoring.md](../../rules/player-card-authoring.md).

## Engine/Content Requests

1. **The `overflow` rule** — the one new engine mechanic: healing routed to an ally at or above `maxHealth`, on a card carrying the Keyword, deals the surplus (capped at printed healing) as Boss damage and stamps `effect_landed`. Everything else she does is expressible today.
2. **Verify `spend` on an ally target** — Q11's risk: `on: "target"` predates ally targeting. A test must prove it reads the chosen ally, not the caster, with a mutation entry if it does not.
3. **The Signature cover effect** — a pre-emptive per-Hero conversion of the next incoming blow. Closest existing shape is the Counter system; whether it is a Counter or a new Hero flag is an engineering choice, not a design one.
4. **The second seat** — `embermaw_attrition_trial` adds `maren` to its `party` when she is authored, which is the moment the D-082 gate tests flip from proving the problem to proving the answer.

## Playtest Scorecard

- Can the player name the Incoming Beat each preservation card was played against? (Principle 4)
- Did she threaten the Boss this run without holding a damage card? (Principle 3)
- Did a Sear ever sit unanswered because clearing the *other* Hero's mark was better? (triage is the skill)
- Did the Signature fire at least once per run, and was the covered ally actually hit? (Q23's cap tuning)
- After a loss: does the player name a missing Role or a wrong read — never "the healer was slow"? (Principle 5)

# The First Healer Hero

Status: ready-for-agent

## Player Problem

The game has one playable Hero and one role. The [Role Contract](../../../docs/rules/encounter-design-bible.md) defines three questions about the same Boss problem — "How do we survive the hit?" (Tank), "How do we sustain the party?" (Healer), "How do we beat the clock?" (Damage) — and only the first is playable. Until a second role exists, the co-op promise is a claim rather than an experience, and the two failure walls D-017 keeps live (stalemate and race) have no cooperative answer, which is what the party is *for*.

A Healer is the natural second role: the design research is already done, the principles are already canon, and the Tank's whole mitigation identity is defined against a sustain owner who does not yet exist.

## What Is Already Decided (no re-litigation needed)

| Settled | Where |
| --- | --- |
| Healer owns sustain; Tank owns mitigation. Tank self-healing stays limited so the Healer keeps a real economic purpose. | [Encounter Design Bible](../../../docs/rules/encounter-design-bible.md), Role Contract |
| Five Healer Design Principles: load-bearing or optional; half the kit is not healing; the damage sub-game converts; proactive is a puzzle; no blame-sink. | [Character Design Bible](../../../docs/rules/character-design-bible.md) |
| The Enchanter (augment/shield through pre-placed wards) is the *planned* first healer; a Catcher-style controller (zones, denial, lockdown) is the named future sibling, and the Second Hero Of A Role rule applies to healers from day one. | Character Design Bible |
| Off-role answers are superiority, not exclusivity (D-025), priced from a fixed four-cost vocabulary. Never `[HEALER ONLY]`. | Character Design Bible, Off-Role Answers |
| The no-healer-clear test: a Party that clears comfortably with no healer means the encounter or the sustain budget is misauthored. | Character Design Bible; `Role-Load-Bearing Beats` in the Ashen Trial design |
| The Bond (Atonement-shaped ward that converts her Boss damage into ally healing) is the researched Signature candidate. | [Healer research note](../../../docs/content/research/2026-08-17-healer-support-design-lessons.md) |

## The Blocking Difference From Kessa Varn

Kessa was drafted against missing seams and that was fine, because her **core loop is solo-coherent**: move, build Momentum, turn the Boss. Only `Breach` waits on the Party.

A Healer's core loop is not solo-coherent. Three hard engine facts:

| Fact | Evidence |
| --- | --- |
| Healing always lands on the firing Hero. There is no "heal target". | `web/src/engine/resolve.ts:207` — `hero.health = min(maxHealth, health + effects.healing)` |
| A `piece` target must be an Enemy. Allies cannot be selected at all. | `web/src/engine/legality.ts:166` — `if (!target \|\| target.team !== 'enemy') return illegal(...)` |
| There is exactly one Hero in an Encounter. | Multi-Hero party model is Engineering rank 6 |

So a Healer drafted today would be a Hero whose entire raid job is unexpressible — not one deferred clause, but the loop. Her deck would fall back on self-heal and Boss damage, which is precisely the **green-DPS limbo** the research note identifies as the documented cause of the FFXIV healer strike. Drafting her as a solo-playable proxy would therefore violate the first Healer Principle and the Kled lesson in one move.

Separately, her researched Signature is blocked: the Bond converts *her damage* into healing, which is a `host_deals_damage` earn, and only `host_takes_damage` is evaluated today (Engineering rank 15, [request](../../../docs/content/design-proposals/signature-earn-vocabulary.md)).

## Desired Outcome

A second playable role exists, so that a party of two answers a Boss problem neither Hero can answer alone — and the Tank's mitigation identity finally has the sustain counterpart it was defined against.

## Non-Goals

- The full three-role party. Two Heroes (Tank + Healer) is the smallest configuration that proves the Role Contract.
- The Catcher-style controller sibling. One healer first; the Second Hero Of A Role rule needs a first.
- Breach, rear-arc targeting, and Encounter Responsibilities — each is separately gated. The zero-health lifecycle is designed (D-070, ADR 0036) and awaits implementation.
- Raid-run rewards and deck evolution.

## Acceptance Evidence

- A Party of Tank + Healer clears an authored Encounter that **neither clears alone**, and the sweep still reports zero solo victories (D-016).
- At least one authored Beat carries pressure the Healer's kit answers and the Tank's does not, per the no-healer-clear test.
- The Healer player can name the Incoming Beat a preservation card was played against (Proactive-is-a-puzzle test), and can name a moment they threatened the Boss (Half-the-kit test).
- Encounter Records credit damage prevented and windows covered, so a failed Round produces a shared lesson rather than "the healer was slow".

## Affected Roles

Game Design (kit and encounter content), Architecture (party model, ally targeting, heal routing), UI/UX (party frames — ADR 0033 built the Hero Frame explicitly as the party-frame seed), Test Automation (party-aware evaluation policies; the sweep is solo-tank shaped today).

## Decisions (user, 2026-08-19)

1. **Sequencing: build the party seams.** The Healer justifies promoting the multi-Hero model rather than waiting. **Done** — the engine and content seams shipped as D-069 / ADR 0035.
2. **Minimum party: two Heroes.** The schema allows one to four; two is what the first authored party content targets.
3. **Draft shape: party-first.** With the seams in, the Healer is drafted against a real party rather than as a solo proxy — which is what the Kled lesson and the first Healer Principle both demanded.
4. **Signature at launch: unblocked.** The Bond's `host_deals_damage` earn is evaluated since D-071 / ADR 0037, gated on `effect_landed`. She can be drafted with her Signature.

## Remaining Before A Healer Is Playable

- ~~**The zero-health lifecycle**~~ **Shipped 2026-08-20** (D-070, ADR 0036). A failed save now costs a `Downed` ally and then an `Incapacitated` one, never an eliminated player — so her triage decisions are hard without being cruel, and a failure to save is a recoverable mistake rather than an instant loss.
- **Party UI** — a second Hero Frame, hero switching, and ally target selection. Held deliberately for the design-system pass.
- **Named follow-on, not a blocker: the event registry** ([ADR 0041](../../../docs/adr/0041-dispatch-every-triggered-effect-from-one-event-registry.md)). The Healer branch merges first; the registry migration then lands on top and sweeps the Healer wave in the same pass — renaming Sundered and Seared to `host_damage_incoming` (D-085) and pinning subscriber order with a test staged on the Elian + Maren duo. Until it lands, the Healer effort should author no *new* `host_takes_damage` modifier readers beyond Seared, and should flag any further pre-mitigation mechanics (Underwritten-shaped conversions) so the migration surface stops growing.
- **Party-aware evaluation** — the sweep's policies are solo-tank shaped, so the no-healer-clear test has no automatic half yet.
- **Frontend mockups** — the user is designing these before implementation.

## Canonical Sources

[Character Design Bible](../../../docs/rules/character-design-bible.md), [Encounter Design Bible](../../../docs/rules/encounter-design-bible.md), [healer research note](../../../docs/content/research/2026-08-17-healer-support-design-lessons.md), [design backlog](../../../docs/content/design-backlog.md), [signature earn vocabulary request](../../../docs/content/design-proposals/signature-earn-vocabulary.md), [authoring a new Hero](../../../docs/content/authoring-a-new-hero.md).

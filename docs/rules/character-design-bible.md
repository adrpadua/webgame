# Character Design Bible

Status: active content-authoring guidance. This document guides Hero identity and deck design. It does not create executable rules; `EncounterEngine` remains authoritative. Its Boss-side counterpart is the [Encounter Design Bible](encounter-design-bible.md), which carries the role contract ("three questions about the same Boss problem") every Hero here answers one of.

The **Signature Slot** below is live: adopted 2026-08-19 as D-064 with ADR 0032, full shape in [fixed-hero-power.md](../content/design-proposals/fixed-hero-power.md), and shipped the same day — the engine runs it, `Shield Slam` and D-015's graded cash-out retired into it, and Elian's *Riposte* is the first authored Signature. The gate's banking prototype falsified the original activation numbers' bank line; the same-day ruling (proposal decision 13) added the full-bank rider — fired at the cap, the *Riposte* also places `Sundered` — which the card text below carries.

## Design Promise

Every Hero must deliver two feelings at once:

1. **Build a machine.** The player learns a small, particular network of setup, conversion, payoff, and recovery cards. A modest card becomes valuable because of the cards, Charges, board position, or incoming Boss pressure around it.
2. **Do the job.** That machine solves a recognizable raid role: hold dangerous space, keep allies alive, create burst windows, control Minions, or answer a specific mechanic.

A strong turn is therefore not only efficient. It is legible in retrospect: *I recognized the mechanic, assembled my class's answer, and the party was safer or stronger because I did my job.*

## The Sentinels Lesson

`Sentinels of the Multiverse` demonstrates that a cooperative Hero game can keep its base turn legible while individual Hero cards create highly specific interactions and powerful combos. Its official description summarizes the turn as play a card, use a power, and draw a card, while emphasizing that card abilities can create combos or change the normal rules [Sentinels Digital](https://sentinelsdigital.com/buysotm). It also presents a team of Heroes with distinct playstyles facing authored Villains [Sentinels Digital](https://sentinelsdigital.com/buysotm).

Borrow:

- a deck may have a dense, signature internal vocabulary;
- setup pieces, converters, and payoffs can make the same deck play differently from encounter to encounter;
- a Hero has a clear primary contribution even when its cards have unusual interactions;
- cooperative timing makes another Hero's needs part of the puzzle.

Do not borrow:

- a boardless rules model;
- card text that requires players to memorize exceptions before the first meaningful decision;
- long, unbounded reaction chains;
- a generic card family relabeled for every class.

Our adaptation is spatial and mobile-first: the Action Bar and Charge Stack are the visible machine, while range, facing, telegraphs, and party roles decide what that machine should do.

## Hero Design Contract

Every authored Hero must name the following before its deck grows beyond the teaching slice. Once the contract is answered on paper, the authoring surface is `data/heroes/` plus the deck's files, walked end to end in [authoring-a-new-hero.md](../content/authoring-a-new-hero.md).

| Element | Required statement | Design test |
| --- | --- | --- |
| Raid job | What danger or opportunity does this Hero own for the party? | A player can say why the party wants this Hero. |
| Signature | The Hero's fixed two-clause power: an earn condition (standing clause) that restates the raid job as a rule, and an activation that is the machine's cash-out. | A new player can connect the earn condition to the Hero's board job, and the payoff reads as correct play converted, not a bonus button. |
| Engine nouns | Two to four persistent or countable things that cards care about. | Each noun is visible, bounded, and has a plain-language meaning. |
| Setup | What low-commitment actions establish the engine? | Setup is useful alone, not a dead card. |
| Conversion | What turns setup into a different capability? | The player can identify why card A changes card B. |
| Payoff | What high-value result proves the engine mattered? | The payoff solves a raid problem, not only a spreadsheet problem. |
| Recovery | How can the Hero restart after a bad hand, forced replacement, or disrupted position? | A setback delays the plan; it does not make the Hero nonfunctional. |
| Spatial expression | Which range, adjacency, facing, or tile relationship reinforces the job? | Ignoring the board makes the Hero noticeably worse. |
| Counterpressure | Which Boss pressure asks this Hero to choose a different line? | There is no universal best charging sequence. |
| Signature weakness | What price does this Hero's strength pattern pay? | The weakness is stated up front, visible in play, and not quietly compensated away by another card. A design doc that lists only strengths is half-finished. |
| Team handoff | What does the Hero enable, protect, or create for another role? | The benefit is actionable and visible, not a vague aura. |

## Machine Shape

Use this four-part loop when writing a Hero's cards:

`setup -> convert -> payoff -> recover`

- **Setup** establishes a keyword, board state, stored defense, target condition, or charged Slot.
- **Convert** reads that established state and changes its value or purpose.
- **Payoff** produces a role-relevant result: survival, protection, add control, positional access, or a planned damage window.
- **Recover** finds, preserves, rebuilds, or safely replaces a broken part of the loop.

Not every card must occupy exactly one role. But the deck as a whole needs all four. A deck made only of payoffs is a pile of conditional finishers; a deck made only of setup is busywork.

**Where the payoff lives.** With the Signature Slot, the machine's primary payoff is printed on the Hero: the Signature's standing clause names what the machine converts toward (the earn condition), and its activation is the cash-out. The deck does not lose the payoff role — it loses *ownership* of it. Deck cards in the payoff family become windows the engine exploits or amplifies, and the deck's dominant jobs shift to setup, conversion, and **fuel**: the cards whose correct play *causes* the earn condition. For a Warden that is Armor sized to the incoming hit — under earned charge, mitigation density is the engine's income, which is why `Iron Guard` at 8 copies is the settled fill for `Shield Slam`'s retired slots. One timing truth the first migration cohort measured: against an Instant-row Tank Hit, only Armor banked the Round before (Fortify's Slow commitment) can produce the zero-loss block, because Quick-window Armor arrives after the Instant row resolves. `Fortify` is the earn's fuel; `Iron Guard`'s density pays in survival and Charge fodder. An earn condition's fuel has to be a card that can actually arrive before the event it answers — check the Round structure, not just the noun.

### Shared Action-Bar Translation

For this project, the Top Card is the **installed module** and charged hand cards are its **configuration**. The Top Card owns timing, targeting, range, base effect, and maximum Charge. Charged cards do not resolve their own rules text; they alter the installed module only through supported Charge Modifiers and card Keywords.

This produces readable combo construction:

1. install an ability that addresses a future need;
2. Charge it with a hand card whose Keyword improves the installed ability;
3. fire it in the legal Window when the board calls for it;
4. decide whether to retain the partly built module or replace it at next-round Loadout;
5. when a Slot reaches its maximum Charge, discard its Top Card and all charged cards at full-charge cleanup.

Do not write a card that promises a tucked card's printed effect. Do not describe a combo that the supported Charge Modifier, target, and timing contracts cannot execute.

## The Signature Slot

Every Hero carries a Signature: a fixed third Action Bar Slot whose Top Card is printed on the Hero and carries two clauses. The **standing clause** is always on — when its authored event passes its gates, the Slot gains one Charge. The **activation** fires in its printed window like any Slot, spends its whole Charge Stack, and its Top Card stays. Hand cards can never be tucked here; earned Charges persist across Rounds up to the printed `max_charge`, and a trigger while full earns nothing. Design, rationale, and the migration plan: [fixed-hero-power.md](../content/design-proposals/fixed-hero-power.md).

A Signature must satisfy all six rules, in addition to the Hero Design Contract:

1. **No Health income and no free tempo** — the Signature may not repair what the tank principles reserve for the Healer, or the price that defines the Hero's pattern.
2. **Earned, never bought** — the standing clause is the only source of Charge. If a Hero's Signature wants hand-charging, it is not a Signature; it is a third deck slot.
3. **The spine of a good hand, not the fallback in a bad one** — if a well-drawn hand routinely ignores the Signature, the design has failed.
4. **Two clauses, one idea** — the Complexity Budget allows one signature interaction per Hero; a Signature needing two unrelated paragraphs has become two Heroes.
5. **Permanently visible means permanently short** — a card that never leaves the screen must read at a glance.
6. **The earn condition is the Hero's job, stated as a rule** — Elian's is the Warden sentence (*absorb the intended hit on the Guarded Front*). A Signature whose earn condition a new player cannot connect to the Hero's raid job fails the Recognition test.

## MMO Role Tests

Each deck must pass all three tests.

### 1. Recognition

Within two rounds, a new player can identify the role's default responsibility from the board and card language.

- Tank: occupy or protect dangerous space, mitigate the intended hit, and control nearby threats.
- Healer: preserve allies through predictable damage windows and make recovery decisions.
- Damage: create or exploit safe damage windows while respecting target priority and position.

### 2. Responsibility

The role has at least one pressure it addresses more reliably than another role. Do not turn role identity into exclusivity: every Hero needs basic self-preservation and some contribution outside its specialty.

### 3. Performance

When the role responds well, the board makes success visible. Examples include an Armor bar absorbing a Tank Hit, a cleared Minion reopening a route, an ally surviving a telegraphed attack, or a prepared burst window visibly lowering the Boss's health.

## Second Hero Of A Role

A second Hero of an existing role must claim a distinct strength-and-price pattern, not a re-skinned copy of the first. The subclass grammar in the [champion design research note](../content/research/2026-08-16-lol-champion-design-lessons.md) is the working vocabulary: Elian Voss is the Warden-style tank (hold the line, lock the front, protect), so the second tank claims the Vanguard pattern (initiation and tempo — forcing Boss facing, opening windows — paid for with weaker sustained mitigation); the proposed Vanguard, Kessa Varn, is designed in [kessa-varn-design.md](../content/heroes/kessa-varn-design.md).

## Tank Design Principles

Any Hero whose raid job is holding dangerous space must satisfy all six principles below, in addition to the Hero Design Contract and Design Value Review. They are distilled from the [tank solo-ceiling research note](../content/research/2026-08-17-tank-solo-ceiling-design.md) and enforce D-016: the tank must be excellent at its axis yet structurally unable to solo the raid.

| Principle | Rule | Design test |
| --- | --- | --- |
| Sustain is a stream, not a budget | The tank's kit converts hits into survivable form (Armor sized to the hit, cleared each Round) but owns no meaningful Health income. Authored attrition per Round exceeds what mitigation can fully blank on average: perfect play slows the bleed, never stops it. | Across an evaluation cohort, a solo tank's Health trend is monotonically downward under optimal play. The Warden makes a hit survivable; only a Healer makes it sustainable. |
| Both failure walls stay live | The Encounter Clock closes the survive-forever stalemate; authored attrition closes the damage race. Solo optimal play must lose to both. | No evaluation policy reaches Boss defeat (D-016 red flag) and none survives the full clock comfortably. A policy that dodges one wall by refusing an axis (for example, range camping) is an encounter authoring defect. |
| Structural over numeric ceilings | The solo ceiling is built from demands a single body cannot meet — role-locked counter tags, simultaneous positional demands, occupy-or-pay hexes — never from numbers alone, because numeric ceilings erode under optimization. | Ask of every solo-ceiling mechanism: would doubling the tank's stats break it? If yes, it is a numeric patch, not a ceiling. |
| Escalation outpaces one actor's economy | Threat per Round grows with the encounter (Minion accumulation, phase pressure, added demands); actions per Round grow only with Party size. One Hero's Slots and card income must be visibly insufficient for the full demand set by mid-encounter. | By the Round-4 checkpoint, the board carries at least one live demand the solo tank had no economy to answer. |
| The loss reads "I need my team" | The solo tank's own axis is visibly won — prevented damage and held position credited in the HUD and Encounter Records — while unanswered demands are labeled for absent roles. Defeat is attributed to empty Party slots, never to tank weakness. | A playtester who loses the solo slice names a missing role, not a personal failure, when asked why the run ended. |
| Party scaling raises the walls, not the tank | Boss health and demand density scale with Party size; the tank's own numbers stay constant across Party sizes so mastery transfers and the solo slice stays an honest diagnostic. | The same tank line plays identically in solo and Party cohorts; only the encounter around it changes. |

## Healer Design Principles

Any Hero whose raid job is preserving allies must satisfy all five principles below, in addition to the Hero Design Contract and Design Value Review. They are distilled from the [support/healer design research note](../content/research/2026-08-17-healer-support-design-lessons.md), whose strongest evidence is what happens when they are violated.

| Principle | Rule | Design test |
| --- | --- | --- |
| Load-bearing or optional | Authored encounter content must demand the healer's kit: some Boss pressure carries counter tags only healer cards execute. Other roles' self-sustain reduces the healer's load but never replaces it. | The no-healer-clear test: if a Party can comfortably clear the encounter with no healer, the encounter or the sustain budget is misauthored. |
| Half the kit is not healing | A healer is a threat that also preserves, not a health-bar janitor. The deck carries real Boss pressure, augmentation, or control alongside its preservation cards. | A healer player can name a moment they threatened the Boss, not only a moment they undid damage. |
| The damage sub-game converts | Whatever the healer does when healing is not needed must feed the healing machine — pre-placed, decision-rich, scaling conversion, not a flat passive link. | Removing the conversion decisions (who carries the ward, when to commit) would visibly weaken the healer's output. If the link is automatic wallpaper, redesign it. |
| Proactive is a puzzle, reactive is a treadmill | Healer decisions key off the visible Boss Timeline: cover a named future window, not repair a surprise. Round-clearing effects renew the triage decision instead of letting a solved state persist. | The player can say which Incoming Beat a preservation card was played against. A healer turn spent purely undoing untelegraphed damage is an authoring defect, not a difficulty knob. |
| No blame-sink | The healer must not be sized to cover everything (triage is the skill), and their prevention must be visible: Encounter Records and the HUD credit damage prevented and windows covered, the way the Tank's earned Riposte is credited. | A failed Round produces a readable shared lesson, not a default verdict of "the healer was slow." |

The Second Hero Of A Role rule applies to healers from the first one: the planned Enchanter (augment and shield through pre-placed wards) and a future Catcher-style controller (zones, denial, lockdown) must not converge. The same rule applies to future Healers (augment-and-shield versus control-and-deny) and Damage Heroes. Both siblings must still pass the same Role recognition test; what differs is the machine, its signature weakness, and the pressure it answers best.

## Off-Role Answers

Role identity is expressed as **superiority, not exclusivity** (D-025). One role answers a given problem cheapest; the others may keep an expensive line to the same answer. This preserves specialization, creates clutch saves, and stops one exhausted or Downed player from turning every mistake into deterministic failure — while off-role deckbuilding stays possible without making party composition meaningless.

Where an off-role answer is **required** is an encounter-side question, decided by the run-ending test in the [Encounter Design Bible](encounter-design-bible.md): a problem is run-ending if one unanswered Round causes unavoidable defeat, permanent Hero loss, or an Escalation Threshold crossing. Those problems must carry at least one off-role line. Elsewhere it is optional.

What an off-role answer may **cost** is a Hero-design question, and the premium is drawn from this fixed vocabulary:

| Cost | Shape |
| --- | --- |
| Extra actions | The same answer takes more of the Round than the suited role spends. |
| A card discard | The answer is paid for out of the Hero's own economy. |
| A Class Resource | The answer spends what the Hero's signature actions need. |
| Partial damage | The answer lands, but some consequence still resolves. |

The vocabulary is fixed and the pricing is per card, deliberately. A single standardized currency would route every off-role answer through one resource some role does not have; free-form costs with no vocabulary would be unlearnable. A fixed list lets a player recognize the *shape* of an off-role answer on a card they have never seen. Two prohibitions: never price an off-role answer so cheaply that the suited role's ownership stops mattering, and never write a hard lock (`[HEALER ONLY]`) where a premium would do.

## Commitments

A card whose job is to answer a *named future* Boss Beat should be authored as a **Commitment** rather than as a Status Effect (D-028, see the [Encounter Design Bible](encounter-design-bible.md)). **No card is one yet.** Fortify was originally reclassified as the first Commitment and that was retracted: it prepares for whatever next Round opens with rather than for a named Beat, and since ADR 0031 nothing shows next Round at all, so there is no entry it could bind to. Fortify is a Status Effect with delayed onset — which is the honest reading of a card that buffs its own Hero.

Two authoring consequences. A Commitment may only bind to a Beat whose parameters are disclosed, which since ADR 0031 means a Beat on this Round's Timeline; a card that wants to prepare for a *kind* of problem, or for a Round the player can only guess at, is a Status Effect, not a Commitment. And a Commitment prepares — it never redirects a Beat's target or changes what the Beat is. That ban is effect-level: it binds any mechanism that could produce the same effect, including a status applied to the Boss.

## Authored Statuses

A card may apply a Status Effect by naming one from the status catalog (D-033). Where it lands comes from the card's `target_type`: `none` applies it to the firing Hero, `piece` to a selected Enemy, `board_slot` to an ally's Top Card. An Enemy-facing status carries `damageTakenBonus` or `damageDealtPenalty`; a Hero-facing one carries the Armor and Boss-damage fields already in use.

Two authoring rules. Reuse the target kind's existing rule rather than inventing one — every Enemy, the Boss included, must be within `range_tiles` (D-070), and an ally's card needs no adjacency. And check the catalog before writing a new status: if a status with the meaning you want exists, apply that one, because a second Sundered with different text is how a vocabulary stops being shared.

## Card Family Guidance

Give every card a deliberate place in the machine. For an initial 20-card deck, aim for five to seven card identities with copies, not twenty isolated mini-rules.

| Card family | Job | Healthy count | Failure mode to avoid |
| --- | --- | --- | --- |
| Foundation | Establish an engine noun or dependable baseline action. | Several copies. | It only matters when another rare card is already in play. |
| Converter | Revalues a foundation through a Keyword, Charge state, board state, or timing window. | A small repeatable package. | It is secretly just a larger number. |
| Payoff | Resolves a class-relevant raid problem. The primary cash-out lives on the Signature; a deck payoff is a window the engine exploits, never a duplicate of the Signature's own payoff. | Fewer copies than foundation. | It is always correct to fire immediately — or it competes with the Signature for the same identity while being less reliable, which is why `Shield Slam` retired. |
| Flexible response | Trades raw efficiency for answering varied Boss pressure. | Limited but dependable. | It replaces every specialized card. |
| Recovery / tutor | Restarts a disrupted engine or makes a narrow plan reliable. | Sparse and purposeful. | It eliminates all hand and Slot tension. |
| Signature exception | Makes this Hero feel unlike any other. | One compact, well-tested subsystem. | It adds an unbounded rules exception or a new invisible meter. |

## Elian Voss Application

Captain Elian Voss's machine is currently **Shield Wall**, not holy spellcasting.

| Part | Elian expression |
| --- | --- |
| Raid job | Hold the Guarded Front, survive the intended Tank Hit, and keep a safe route open. |
| Engine nouns | Armor, `Guard` Keyword count in a Charge Stack, Signature Charges (retiring the Riposte Ready Counter), and the prepared Quick/Slow Slot. |
| Setup | Install a defense or attack, then Charge it with cards that establish useful `Guard` interactions and take the Guarded Front. |
| Convert | A `Guard` charge improves a defensive installed module; a Boss Tank Hit absorbed on the Guarded Front for `0` Health loss grants the *Riposte* Signature one Charge (max `2`; a block while full earns nothing). |
| Payoff | Fire *Riposte*: spend all Signature Charges for `3` Boss damage `+2` per Charge; fired at the cap of `2` it also **Sunders** the Boss for the Round — cash one for tempo, or bank to two when follow-up hits are waiting to land through the wound. Elsewhere: absorb the hit that would break the line, or clear a nearby Minion. |
| Recovery | Replace a Slot during Loadout, retain a partially charged plan where legal, or discard a hand card for Stamina and reposition. |
| Spatial expression | The Guarded Front: the Boss-facing adjacent hex is where Elian's mitigation and the Riposte loop live. Leaving it costs the payoff condition. |
| Counterpressure | Targeted Tank Hits (`Raking Claw`) are aimed at Elian rather than at a pattern, and reach one hex (D-062) — so the choice is Armor or the step out, and the step is priced by `Within Reach` in Escalation rather than being free; Armor sizing competes with damage progress every Round, while telegraphed cones and Whelp spawns pull Elian between holding the Front and answering the board. |
| Signature weakness | Warden's price: low personal tempo. Elian has no initiation, burst, or cheap repositioning — movement costs a card, and damage beyond Steady Strike must be earned through correct defense. |
| Team handoff | Deferred until multi-Hero rules exist: Interception is the intended visible rescue tool, but must not enter the live deck before its engine/UI contract passes. |

The key play-feel test: Elian should occasionally choose a lower-damage line because it creates the correct defense for the next known mechanic, then feel smart when that preparation visibly earns a Signature Charge. Signature Charges are a capped bank (`2`), not a meter that trickles: overcap is waste, and a block while full earns nothing. Elian must not build Armor only because larger numbers are generically good, and firing *Riposte* at one Charge must not become the automatic next action — banking to the cap has to stay a live choice. The proposal's banking prototype showed numbers alone cannot deliver that (cash-at-one dominated); the full-bank **Sundered** rider (proposal decision 13) is what keeps it live, and it makes the bank read a *hand* read — ride to two when Steady Strike and Sweeping Blow are waiting to land through the wound, cash at one when they are not.

## Complexity Budget

Complexity belongs in interactions, not in basic input handling.

- Use two to four engine nouns for a Hero before adding a new one.
- Give the starter deck one signature interaction and one optional branch, not several disconnected subsystems. The Signature Slot is that interaction's home: the deck branches, the Signature anchors.
- Explain the current modifier at the Action Bar, on demand, rather than forcing card-text rereads.
- Make each declared target, range, and timing rejection visible before commitment.
- Keep long-term mastery in reading the Boss script and choosing a machine configuration, not in discovering hidden rules.

## Design Value Review

Riot's League of Legends champion design names six standing design values — Mastery, Meaningful Choices, Counterplay, Teamplay, Clarity, and Evolution — as a shared review vocabulary. The sourcing and rationale are in the [champion design research note](../content/research/2026-08-16-lol-champion-design-lessons.md). Check every Hero proposal and deck revision against all six, in this project's terms:

| Value | Project test |
| --- | --- |
| Mastery | The Hero rewards practiced play — reading the Boss script and choosing a machine configuration — beyond memorizing one rotation. Veteran over-performance is the intended reward, not automatically a balance defect. |
| Meaningful Choices | Firing versus Charging, holding versus replacing a Slot, and cashing a payoff each have no dominant line. If a decision is a no-brainer, redesign the decision rather than the numbers. |
| Counterplay | Every Boss pressure the Hero is expected to own has an answer the Hero can actually execute, and every Hero payoff has a condition the Boss design can pressure. |
| Teamplay | The Hero's job creates or protects something visible for another role (the Team handoff row of the Hero Design Contract). |
| Clarity | The danger, the legal answer, and the payoff condition are readable from the Boss Timeline, board, and Action Bar without hidden rules or card-text archaeology. |
| Evolution | The kit leaves authored room to grow — new converters, encounter-specific pressure, later party interactions — without rewriting its settled rules. |

A review that fails one value is not an automatic rejection; it is a named conversation the proposal must resolve before promotion.

## Content Approval Checklist

Before a Hero card or deck enters a controlled playtest, record:

- player-facing intent;
- precise supported rule and legal timing;
- engine nouns touched;
- setup, converter, payoff, or recovery role;
- target/position/facing requirements;
- role contribution and what Boss pressure makes it relevant;
- edge cases and invalid actions;
- Encounter Record facts and focused probe required;
- a new-player test question that reveals whether the combo was understood;
- a completed Design Value Review pass (the section above), with any failed value either resolved or named as an open conversation.

Before promoting a future deck into the default encounter, require the scorecard evidence in `docs/content/deck-evaluation-rubric.md`: both Viability and Play-feel need at least `3/5`; the deck must not be promoted on subjective enthusiasm alone. The Elian Voss Shield Wall migration is a user-approved product exception recorded in `.scratch/product-backlog/issues/04-promote-aegis-starter-deck-to-shield-wall-kit.md`; it does not weaken this rule for later decks.

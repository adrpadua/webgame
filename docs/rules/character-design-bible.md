# Character Design Bible

Status: active content-authoring guidance. This document guides Hero identity and deck design. It does not create executable rules; `EncounterEngine` remains authoritative.

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

Every authored Hero must name the following before its deck grows beyond the teaching slice.

| Element | Required statement | Design test |
| --- | --- | --- |
| Raid job | What danger or opportunity does this Hero own for the party? | A player can say why the party wants this Hero. |
| Engine nouns | Two to four persistent or countable things that cards care about. | Each noun is visible, bounded, and has a plain-language meaning. |
| Setup | What low-commitment actions establish the engine? | Setup is useful alone, not a dead card. |
| Conversion | What turns setup into a different capability? | The player can identify why card A changes card B. |
| Payoff | What high-value result proves the engine mattered? | The payoff solves a raid problem, not only a spreadsheet problem. |
| Recovery | How can the Hero restart after a bad hand, forced replacement, or disrupted position? | A setback delays the plan; it does not make the Hero nonfunctional. |
| Spatial expression | Which range, adjacency, facing, or tile relationship reinforces the job? | Ignoring the board makes the Hero noticeably worse. |
| Counterpressure | Which Boss pressure asks this Hero to choose a different line? | There is no universal best charging sequence. |
| Team handoff | What does the Hero enable, protect, or create for another role? | The benefit is actionable and visible, not a vague aura. |

## Machine Shape

Use this four-part loop when writing a Hero's cards:

`setup -> convert -> payoff -> recover`

- **Setup** establishes a keyword, board state, stored defense, target condition, or charged Slot.
- **Convert** reads that established state and changes its value or purpose.
- **Payoff** produces a role-relevant result: survival, protection, add control, positional access, or a planned damage window.
- **Recover** finds, preserves, rebuilds, or safely replaces a broken part of the loop.

Not every card must occupy exactly one role. But the deck as a whole needs all four. A deck made only of payoffs is a pile of conditional finishers; a deck made only of setup is busywork.

### Shared Action-Bar Translation

For this project, the Top Card is the **installed module** and charged hand cards are its **configuration**. The Top Card owns timing, targeting, range, base effect, and maximum Charge. Charged cards do not resolve their own rules text; they alter the installed module only through supported Charge Modifiers and card Keywords.

This produces readable combo construction:

1. install an ability that addresses a future need;
2. Charge it with a hand card whose Keyword improves the installed ability;
3. fire it in the legal Window when the board calls for it;
4. decide whether to retain the partly built module or replace it at next-round Loadout;
5. when a Slot reaches its maximum Charge, discard its Top Card and all charged cards at full-charge cleanup.

Do not write a card that promises a tucked card's printed effect. Do not describe a combo that the supported Charge Modifier, target, and timing contracts cannot execute.

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

## Card Family Guidance

Give every card a deliberate place in the machine. For an initial 20-card deck, aim for five to seven card identities with copies, not twenty isolated mini-rules.

| Card family | Job | Healthy count | Failure mode to avoid |
| --- | --- | --- | --- |
| Foundation | Establish an engine noun or dependable baseline action. | Several copies. | It only matters when another rare card is already in play. |
| Converter | Revalues a foundation through a Keyword, Charge state, board state, or timing window. | A small repeatable package. | It is secretly just a larger number. |
| Payoff | Resolves a class-relevant raid problem. | Fewer copies than foundation. | It is always correct to fire immediately. |
| Flexible response | Trades raw efficiency for answering varied Boss pressure. | Limited but dependable. | It replaces every specialized card. |
| Recovery / tutor | Restarts a disrupted engine or makes a narrow plan reliable. | Sparse and purposeful. | It eliminates all hand and Slot tension. |
| Signature exception | Makes this Hero feel unlike any other. | One compact, well-tested subsystem. | It adds an unbounded rules exception or a new invisible meter. |

## Aegis Guardian Application

Captain Elian Voss's machine is currently **Shield Wall**, not holy spellcasting.

| Part | Aegis expression |
| --- | --- |
| Raid job | Hold the Guarded Front, survive the intended Tank Hit, and keep a safe route open. |
| Engine nouns | Armor, `Guard` Keyword count in a Charge Stack, Riposte Ready, and the prepared Quick/Slow Slot. |
| Setup | Install a defense or attack, then Charge it with cards that establish useful `Guard` interactions and take the Guarded Front. |
| Convert | A `Guard` charge improves a defensive installed module; a Boss Tank Hit that causes `0` Health loss in the Guarded Front grants one Riposte Ready. |
| Payoff | Consume Riposte Ready with Shield Slam for `+2` Boss damage, absorb the hit that would break the line, or clear a nearby Minion. |
| Recovery | Replace a Slot during Loadout, retain a partially charged plan where legal, or discard a hand card for Stamina and reposition. |
| Team handoff | Deferred until multi-Hero rules exist: Interception is the intended visible rescue tool, but must not enter the live deck before its engine/UI contract passes. |

The key play-feel test: Elian should occasionally choose a lower-damage line because it creates the correct defense for the next known mechanic, then feel smart when that preparation earns a visible Riposte Ready opening. Riposte Ready is one short, non-stacking Status Effect, not a general posture system or extra resource meter. Elian must not build Armor only because larger numbers are generically good, and Shield Slam must not become the automatic next action.

## Complexity Budget

Complexity belongs in interactions, not in basic input handling.

- Use two to four engine nouns for a Hero before adding a new one.
- Give the starter deck one signature interaction and one optional branch, not several disconnected subsystems.
- Explain the current modifier at the Action Bar, on demand, rather than forcing card-text rereads.
- Make each declared target, range, and timing rejection visible before commitment.
- Keep long-term mastery in reading the Boss script and choosing a machine configuration, not in discovering hidden rules.

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
- a new-player test question that reveals whether the combo was understood.

Before promoting a future deck into the default encounter, require the scorecard evidence in `docs/content/deck-evaluation-rubric.md`: both Viability and Play-feel need at least `3/5`; the deck must not be promoted on subjective enthusiasm alone. The Aegis Guardian Shield Wall migration is a user-approved product exception recorded in `.scratch/product-backlog/issues/04-promote-aegis-starter-deck-to-shield-wall-kit.md`; it does not weaken this rule for later decks.

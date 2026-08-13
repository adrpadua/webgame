# Deck Evaluation Rubric

Status: accepted first-pass Design source of truth. Use this to compare early prototype decks; do not treat it as a full analytics system.

## Goal

Evaluate whether a player **Starting Deck** is both effective and fun in the current Godot boss-raid prototype. The evaluation produces two top-level outputs:

- **Viability score**: can the deck survive, stabilize, and make progress against a seeded Encounter without requiring unsupported rules?
- **Play-feel score**: does the deck create clear, satisfying decisions that express the Hero's Archetype without becoming repetitive?

`EncounterEngine` remains authoritative for all rules outcomes. The rubric must not invent HUD-only rules or score presentation-only state as gameplay.

## Evidence Consumer Contract

Status: accepted first-pass Design contract for Engineering Enablement and QA. Owner: Game Design. Consumers: Architecture and QA Automation. This section states what Design needs to make a deck decision; it does not prescribe an engine, report, or UI implementation.

### Decisions That Need Evidence

| Design decision | Minimum question the evidence must answer | Required evidence cohort | Approval or rejection signal |
| --- | --- | --- | --- |
| Keep the baseline or advance to the smallest controlled test deck | Does the deck survive the teaching slice and make intended progress without unsupported or illegal play? | The fixed baseline seed set, one unchanged content fingerprint, terminal outcome/end kind, final Round, and legal/rejected action facts. | At least `3/5` Viability; every seed reaches Round 4; most seeds reach the teaching endpoint. Repeated illegal/unsupported paths reject the candidate. |
| Add or tune a role card | Does the card answer the authored pressure it claims to answer, at the required timing and position? | One focused deterministic scenario for that pressure plus the baseline seed set; card/target identity, relevant board pressure, legal activation, and Resolution Facts. | The card's promised answer occurs through `EncounterEngine` and is visible in the record. A rules-text claim without an executable answer rejects the card. |
| Judge Slot Tension | Did the player face a real choice among useful Slot plans, rather than a forced sequence or cosmetic alternative? | Per-Round hand, Slot, legal-action, selected-action, and window facts, plus a human review of representative runs. | Meaningful Slot decision in most Rounds after Loadout and human agreement that the alternatives had different plausible purposes. |
| Judge role identity and deck play-feel | Did the deck make the player feel and act like its named raid Role without repeating one solved line? | At least three observed runs of the same deck/scenario set, completed human rubric notes, and representative record links. | At least `3/5` Play-feel, a cited role moment, and no dominant sequence that resolves every major pressure. |

### Required Evidence Fields And Scenarios

All automatic evidence must remain attributable to one **Evidence Cohort**: a comparable group of runs sharing one content fingerprint, named scenario/run label, seed, and evaluation purpose. Do not aggregate across cohorts.

| Category | Required fields or scenario facts | Why Design needs it |
| --- | --- | --- |
| Identity | Content fingerprint; selected Encounter and deck identity; scenario/run label; seed. | Establishes that results describe the same authored candidate. |
| Result | Outcome, end kind/reason, final Round, and abandoned status/reason. | Separates failure, End-of-Clock Behavior, and interrupted sessions. |
| Rules truth | Submitted, generated, and rejected actions; explicit Resolution Facts; phase/Round boundaries. | Shows whether a claimed result was legal and what actually resolved. |
| Role pressure | Relevant Boss Beat/telegraph, target identity where applicable, and board state needed to show the pressure existed. | Prevents crediting a deck for answering a problem that never occurred. |
| Per-Round deck state | Hand identity, Slot Top Card/Charge Stack state, legal useful action set, selected action, and cleanup/replacement outcome. | Supports dead-draw, Charge efficiency, and Slot-Tension interpretation. |
| Baseline scenario | `baseline-a`, `baseline-b`, and `baseline-c` using the live Embermaw prototype and the candidate deck. | The first comparable teaching-slice cohort. |
| Contract scenario | A focused deterministic scenario whenever a candidate claims Minion clearing, Slow timing, Hazard response, or another specific role answer. | Stops a general survival result from standing in for untested functionality. |

### Useful But Nonessential Evidence

These sharpen a decision but must not block the first controlled deck pass when the required cohort is sound:

- time spent per decision or per Round;
- tap, drag, or inspection counts;
- card inspection duration;
- detailed per-card contribution attribution when multiple effects overlap;
- broader random seed sweeps after the fixed set has identified a viable candidate;
- visual polish ratings, except when a UI failure prevents a player from reading a required tactical state;
- aggregate averages beyond the named scenarios.

### Human Judgment That Must Not Be Automated

Automated evidence can identify that alternatives existed. It must not claim that they were interesting, understandable, or emotionally rewarding. Retain human review for:

- whether the player understood the Hero's plan and why a Charge mattered;
- whether a possible Slot choice was genuinely plausible rather than obviously inferior;
- whether the deck expressed its named MMO Role in a memorable, party-relevant moment;
- whether an apparent dead draw created fair tension, confusing friction, or simply failed to matter;
- whether three repeated runs felt fresh enough rather than mechanically varied but emotionally flat;
- whether a loss taught a readable counterplay lesson.

### Canonical Evaluation Terms And Acceptance Rules

| Term or rule | Canonical meaning |
| --- | --- |
| Evidence Cohort | Comparable runs with the same content fingerprint, scenario/run label, seed, and evaluation purpose. Never mix cohorts in one score. |
| Teaching endpoint | The intended completion point of the current teaching slice; it must be named by the scenario, rather than inferred solely from Boss health. |
| Useful action | A legal action that materially advances survival, a stated role responsibility, a visible counterplay objective, or a planned engine state for the current or next player window. It is not merely any legal input. |
| Meaningful Slot decision | A choice between at least two useful Slot plans with distinct plausible purposes, confirmed by a human reviewer. Automatic counts are a proxy only. |
| Dead draw | A Hand card that cannot materially help the current or next player window under the current legal board state. It is not simply a card the player did not use. |
| Charge efficiency | The proportion of charged cards that contribute to a successful activation, an intentional Primed hold, or another authored supported result. A charge discarded because of an explicit replacement or cleanup is not automatically waste. |
| Role moment | A recorded, player-observable result in which the Hero fulfills its stated role against a visible raid pressure. |
| Default-deck promotion gate | A future candidate needs both Viability and Play-feel at `3/5` or above, its required focused contracts passing, and no unresolved misleading-output condition. The Aegis Shield Wall default migration is a user-approved product exception; it does not establish a general bypass. |

### Conditions That Make Output Misleading

Do not score or promote a deck from a report when any of the following is true:

- runs with different fingerprints, deck identities, scenario labels, or seeds are silently combined;
- an Abandoned Encounter is treated as a victory or ordinary defeat without its explicit reason;
- a target pressure never appeared, yet the deck is credited with answering it;
- rejected/unsupported actions are omitted, making an illegal line look successful;
- a proxy count for useful actions, Slot Tension, or dead draws is presented as human play-feel judgment;
- a focused deterministic contract is used as evidence of full-encounter balance rather than proof of one rule interaction;
- fewer than three human-reviewed runs are used to claim repetition tolerance;
- UI comprehension failed to expose a required legal target, range, timing, or state, and the run is interpreted as deck weakness.

## Scorecard

Score each output from `0` to `5`, then record the evidence used.

| Score | Viability meaning | Play-feel meaning |
| --- | --- | --- |
| 0 | Cannot complete the scenario or repeatedly reaches illegal/unsupported states. | Decisions are unclear, absent, or contradicted by the UI/rules. |
| 1 | Rarely survives long enough to test the intended mechanic. | The deck mostly asks the same obvious action each run. |
| 2 | Survives some seeds but lacks a repeatable answer to at least one required pressure. | Some decisions matter, but the Hero identity or Slot Tension is weak. |
| 3 | Usually survives the teaching slice and can stabilize after early pressure. | The deck has readable tradeoffs and a clear first-pass identity. |
| 4 | Wins or reaches the intended end state on most seeds with understandable failure cases. | Decisions are varied, class-fantasy expression is clear, and repeated runs remain tolerable. |
| 5 | Consistently wins the intended teaching slice without trivializing its mechanics. | The deck produces strong, repeatable "I chose well" moments with low fatigue. |

For future prototype approval, prefer a deck with both scores at `3` or higher. A score below `3` in either output blocks default-deck promotion unless the user approves a specific product exception.

## Minimum Metrics

| Metric | Capture status | Score it under | Notes |
| --- | --- | --- | --- |
| Win/survival rate by seeded scenario | Automatic once reports expose scenario/run labels | Viability | Group by content fingerprint and seed. Count victory, defeat, end-of-clock, and Abandoned Encounter separately. |
| Rounds survived | Automatic now from Encounter Records | Viability | Use final Round and end kind. |
| Rounds to stabilize | Mixed, pending per-Round summary facts | Viability | Automatic proxy: first Round after which Hero health and Armor trend no longer worsens for two consecutive Rounds. Human note may override when the proxy misreads a tactical reset. |
| Boss damage dealt | Automatic now from Damage Resolution Facts, pending report aggregation | Viability | Sum successful damage to the Boss. |
| Boss damage prevented/mitigated | Automatic in part from Resolution Facts; prevention-source attribution is future work | Viability | Track prevention separately from overkill. |
| Minions cleared | Automatic only after Minion scenarios and board removals are supported | Viability | Current Whelp coverage is blocked pending setup-only Minion placement and typed target firing. |
| Hazard answers | Mixed, pending board-pressure facts or a focused scenario | Viability and Play-feel | Automatic proxy: legal movement or state changes that avoid a telegraphed Hazard/pattern; human confirms whether the answer felt intentional. |
| Dead-draw rate | Automatic only after hand/Slot/window summaries are exposed | Viability and Play-feel | Prototype definition: a card seen in Hand that cannot legally help the current or next player window. |
| Slot Tension / meaningful-choice frequency | Mixed, pending report-side proxy and human confirmation | Play-feel | Automatic proxy: count Rounds with at least two legal useful choices among fire, hold Primed, charge, replace, or move. Human confirms whether the choice felt real. |
| Charge efficiency | Automatic in part from Charge actions; full scoring waits on report aggregation | Viability and Play-feel | Ratio of tucked cards that contributed to a successful Slot activation or intentional Primed hold versus wasted/discarded charges. |
| Class-fantasy clarity | Human rubric now | Play-feel | Ask whether the deck felt like the named Hero Archetype, using observed moments rather than lore preference. |
| Repetition fatigue across repeated runs | Human rubric now | Play-feel | Ask after at least three runs with the same deck/scenario set. |

## Human Playtest Rubric

After each run, ask the player or observer to answer each item from `1` to `5`.

| Prompt | 1 | 3 | 5 |
| --- | --- | --- | --- |
| Did you know what the deck was trying to do? | No clear plan | A plan emerged after several Rounds | Clear from the first two Rounds |
| Did the deck express its Hero identity? | Generic cards | Some tank/role moments | Strong Aegis Guardian / Shield Wall moments |
| How often did you face a meaningful Slot decision? | Rarely | Once or twice per run | Most Rounds |
| Did dead draws feel acceptable? | They blocked play | They appeared but had alternatives | They created useful tension or were rare |
| Did charge decisions feel rewarding? | Tucking felt arbitrary | Some charges mattered | Charge choices shaped the run |
| Did repeated runs feel fresh enough? | Fatiguing by run 2 | Tolerable for 3 runs | Interesting across 3 or more runs |

Record one short free-text note for:

- best decision of the run;
- most confusing decision;
- card that felt weakest;
- card that best expressed the Hero.

## First-Pass Good-Deck Target

For the Embermaw teaching slice, a good Aegis Guardian test deck should:

- score at least `3/5` on both Viability and Play-feel across the fixed seed set;
- survive through Round 4 on every seed and win or reach the intended teaching endpoint on most seeds;
- answer at least one Whelp once the Whelp Clear contract is implemented;
- use at least one Slow Top Card in Slow once the Slow Top Card contract is implemented;
- produce at least one meaningful Slot decision in most Rounds after Loadout;
- keep dead-draw rate low enough that the player can usually make a useful action in the current or next player window;
- show clear Shield Wall identity through mitigation, positioning, and deliberate Slot commitment;
- avoid solving every pressure with the same card sequence.

The first historical evaluation target was not "perfect balance." It compared the former two-card baseline with the smallest approved test list. The Aegis Shield Wall list is now the user-approved live/default starter deck; future evaluation asks whether that current default is understandable, viable, and non-repetitive without inferring further tuning.

## Minimal Gaps

Keep the gaps small and evidence-facing:

1. Encounter Record summaries need per-Round hand, Slot, activation, and board-pressure facts sufficient to compute the automatic metrics above.
2. Reports need a deck-evaluation section grouped by content fingerprint and seed.
3. Probes need deterministic seeded scenarios for the current baseline deck and, later, the Whelp Clear and Slow Top Card contracts.
4. Human rubric capture can remain a Markdown note or checklist; no in-game form is required.

Do not add a HUD score, analytics backend, or presentation-only rule path for this prototype-scale evaluation.

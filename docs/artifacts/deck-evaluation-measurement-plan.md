# Deck Evaluation Measurement Plan

Status: accepted first-pass QA plan for the Design deck-evaluation rubric.

## Purpose

Provide a repeatable measurement path for early **Starting Deck** evaluation without turning the prototype into an analytics system. The plan supports [deck-evaluation-rubric.md](../content/deck-evaluation-rubric.md) and keeps `EncounterEngine` as the source of truth.

## Measurement Inputs

| Input | Owner | Use |
| --- | --- | --- |
| Seeded Encounter Records | QA Automation | Automatic viability and partial play-feel metrics. |
| Focused replay scenarios | QA Automation with Architecture support | Repeatable runs for baseline, Whelp Clear, and Slow Top Card contracts. |
| Human rubric notes | Design | Class fantasy, perceived meaningful choices, fatigue, and confusing moments. |
| Content fingerprint | Architecture / Encounter Records | Prevents reports from mixing different deck or encounter versions. |

## Seed Set

Use a small fixed seed set until the prototype has broader content:

- `baseline-a`: live `resources/encounters/embermaw_prototype.tres`, live Elian Voss starter deck, seed `1337`.
- `baseline-b`: same Encounter and deck, seed `7331`.
- `baseline-c`: same Encounter and deck, seed `20260813`.
- `controlled-a`: evaluation-only `resources/decks/evaluation/aegis_controlled_test_deck.tres`, seed `1337`.
- `controlled-b`: same evaluation-only configuration, seed `7331`.
- `controlled-c`: same evaluation-only configuration, seed `20260813`.

Until dedicated deck-evaluation scenarios exist, those labels mean "run the live Embermaw prototype content with the named seed and record/report the run under that label." If a tool cannot yet emit a scenario label, QA should record the label in the human note and treat scenario labeling as the first reporting gap.

These labels currently evaluate a solo Tank diagnostic, not a complete Party encounter. The target checkpoint is a living Guardian at the **end of Round 4**, plus the documented Tank role evidence. A solo Boss victory and survival beyond that halfway checkpoint are not required; without a Healer, Elian should not be expected to last substantially longer. Preserve outcomes and Boss-damage totals for diagnosis, but exclude post-checkpoint longevity from the solo score. Party victory and end-of-clock success require a future multi-Hero cohort.

The controlled labels are not default-deck promotion. They exist only for the approved Elian controlled test-deck cohort: `8x Steady Strike`, `6x Iron Guard`, `2x Sweeping Blow`, `2x Fortify`, and `2x Shield Slam`. The configuration wraps the live Encounter for content fingerprinting and report grouping, remains a distinct proposal-03 historical/repro fixture, and uses labels separate from historical baseline and post-promotion starter evidence. Proposal 04 promoted the same list to the live/default starter deck, so controlled-cohort validation must not assert the old `10x/10x` default. The live default has since moved on again — D-040 swapped two Steady Strike for two Drive Back — so the controlled list no longer matches it either, and this cohort is now a fixture that resembles no current deck. That is fine for a repro fixture and fatal for anything that reads it as the starter list.

For the Combat Postures Playtester retest dependency, the controlled cohort must prove at least one legal Riposte Ready -> Shield Slam payoff through naturally drawn cards and normal rules actions. Current executable evidence is `controlled-a`: Shield Slam consumes the `riposte_ready` Counter in Quick and records Boss damage `requested=5`, `base_amount=3`, `counter_bonus=2`, and `payoff_card_id=shield_slam`. The other controlled seeds remain useful fixed-seed outcomes, but they are not required to show that payoff.

When Whelp Clear and Slow Top Card support lands, add:

- `whelp-clear-a`: one adjacent Whelp answer test using the accepted contract.
- `slow-anchor-a`: one Fortify / Slow Top Card test using the accepted contract.

Do not expand beyond these until the first scorecard has been reviewed.

## Automatic Metrics

| Metric | Capture path | Current support | Gap |
| --- | --- | --- | --- |
| Win/survival rate by seeded scenario | Encounter Record outcome, end kind, seed, content fingerprint | Supported for fixed baseline | Named scenario/run labels are emitted by the `deck_eval_baseline` Evidence Cohort path. |
| Rounds survived | Encounter Record phase boundaries and final state | Supported | None. |
| Outcome *variance* across seeds | `roundSpread` and `dmgSpread` in the sweep table | Supported | None. A single-value spread (`5-5`) means the draw order changed nothing about how the run ended, which no average can show. |
| Boss Program predictability | `programPredictability`, reported as a sweep footer | Supported | None. Estimated from generated sequences with no knowledge of the generator's rule, so it catches an order that only looks shuffled. |
| Rounds to stabilize | Per-Round health/Armor snapshots plus phase observations | Partial | Current report exposes per-Round Hand/Slot evidence; health/Armor remains available in full snapshots for manual review. |
| Boss damage dealt | Damage Resolution Facts where target is Boss | Supported | Ensure report aggregates by target kind. |
| Boss damage prevented/mitigated | Damage Resolution Facts `prevented` and Armor state | Partial | Attribute prevention source when Armor/status mitigation grows. |
| Minions cleared | Board entity before/after and generated damage actions | Blocked for Whelp contract | Requires setup-only Minion placement and typed target firing. |
| Hazard answers | Movement actions plus telegraphed Hazard/pattern state | Partial | Add board-pressure facts or a focused Hazard-answer scenario. |
| Dead-draw rate | Hand contents, legal actions by window, cards unused at refill/discard | Supported as raw evidence | `phase_observations` and the cohort report expose Hand, Slot, legal-useful-action proxy, and selected-action rows for human scoring. |
| Slot Tension / meaningful-choice frequency | Legal action alternatives per window and chosen Slot action | Supported as raw evidence | The report-side proxy counts public load/replace/charge/fire/move opportunities and selected player-choice actions without automatic play-feel judgment. |
| Charge efficiency | Charge actions, later activation/cleanup, discarded Charge Stack | Partial | Per-Round Slot and selected-action rows support review; no automatic efficiency score is produced. |

## Human-Scored Metrics

Human rubric capture remains outside the game UI.

| Metric | Method |
| --- | --- |
| Class-fantasy clarity | Player/observer rates whether the deck felt like Elian Voss / Shield Wall and cites one observed moment. |
| Repetition fatigue | Same player repeats the seed set at least three times and rates fatigue after the final run. |
| Meaningful-choice quality | Observer marks whether automatic Slot Tension counts reflected real decisions or only obvious play. |
| Hazard-answer intent | Observer notes whether movement or mitigation was a deliberate answer to a visible pressure. |

Store one Markdown note per deck review under [deck-eval-notes](deck-eval-notes/) using the template in that directory. The filename convention is `YYYY-MM-DD-<deck-slug>-<seed-set>.md`, for example `2026-08-13-elian-voss-baseline.md`. The note must include the deck/resource under review, content fingerprint if available, seed labels, the `1` to `5` answers from the Design rubric, and the four required free-text notes.

## Focused Coverage

Preserve the existing probe suite. Add only focused coverage when a metric becomes a durable contract:

1. `deck_eval_baseline`: generates fixed-seed Encounter Records for the current live deck and asserts the three run labels, one fingerprint, observations, selected actions, and legal-useful-action proxy exist.
2. `deck_eval_report`: verifies report grouping by content fingerprint, seed/scenario label, raw viability totals, and the deck-evaluation section.
3. `controlled_deck_eval`: generates fixed-seed Encounter Records for the evaluation-only controlled Elian test deck and asserts exact `8/6/2/2/2` composition, one stable controlled fingerprint, distinct controlled labels, historical/repro fixture provenance, and at least one legal Riposte Ready -> Shield Slam payoff.
4. `controlled_deck_eval_report`: verifies canonical report grouping, raw viability totals, per-Round evidence, filtered controlled-record scope, and the same payoff evidence for the controlled cohort.
5. Extend the future `whelp_clear` and `slow_top_card_cleanup` scenarios to emit enough Encounter Record evidence for minions-cleared and charge-efficiency checks.

Do not make these probes default until the scenario data and report fields are deterministic.

## Escalation And The Enrage Wall

The sweep carries a survival-biased policy, `turtle` (Iron Guard in the Quick Window, Fortify in the Slow Window, no offense), for one reason: the other twelve policies die to attrition long before the Encounter Clock, so the solo slice could never produce evidence about the enrage wall. A policy built to survive can.

It also carries `culler` (Sweeping Blow in the Quick Window, Iron Guard in the Slow, walking to the Whelps), added for the same class of reason. Once Brood Call is priced (D-036), a sweep with no Whelp-answering policy measures only what an unavoidable tick costs — it cannot tell a demand from a tax. `culler` is what makes the difference legible: it is the only policy that reaches Round 8 at all, and the `whelpKills` column is the evidence that the answer is executable rather than theoretical. Its `bossDmg` is `0.00` by construction, which is the honest shape of a solo Hero doing a job the Damage role would own in a party.

Three columns read it: `reachedR8%` (did the run last to the Encounter Clock), `escalation` (the value at the end), and `escFromAdds` (how much came from unanswered demands rather than the automatic tick). `escFromAdds` sitting at `0.00` across every policy is a red flag by inspection rather than by assertion: it means the acceleration lever is authored but inert, which is precisely the state the sweep failed to surface for 540 runs before D-036. The healthy shape for the stalemate wall is a policy that reaches Round 8, ends at Escalation `5`, and shows `0.00` Boss damage — survival without a kill, ended by something other than the Hero's health. That shape is now **counted, not eyeballed**: the sweep tallies qualifying runs and red-flags a count of zero (ADR 0027's third standing criterion). Read the percentages as a dated observation of which policies carry it; the count is the part that must hold.

`checkpoint%` guards the teaching Rounds, but **not as a fixed list of percentages** — that form of the gate was retired for the same reason ADR 0027's recorded figures were. A literal baseline string reads like a rule while only encoding one version of the Boss's content, so the first deliberate content change silently falsified it. What has to hold is that the Round-4 checkpoint **discriminates**: some policies clear it and some do not. All-pass means the teaching Rounds ask nothing, and Tank Principle 4 has lost its evidence; all-fail means they are lethal. The sweep counts both sides and red-flags either collapse, alongside D-016's solo-victory flag and ADR 0027's enrage-wall count.

The structural protection that the fixed baseline was standing in for is a test, not a percentage: automatic ticks begin at `roundLimit - 4`, asserted directly, so no Escalation tuning can reach into Rounds 1 through 3 by that route. Acceleration can and does reach them — a Brood Call answered late costs Escalation from Round 1 onward — and that is deliberate.

## Schedule Readability — the instrument that retired its own subject

Nothing in the sweep read the Forecast Row until D-038, which made ADR 0026's third horizon unfalsifiable: a fixed policy cannot benefit from information it never consults, so no result could have argued either way. The instrument was a matched pair — `forecast_reader` and `forecast_blind`, identical except that the reader consulted `forecast()` before spending its Slow Window on Fortify or holding a shove. Fortify is the only card whose payoff lands next Round (D-019), so the Forecast Row was the only surface that could price the spend, which made the pair a direct test rather than a proxy.

**It returned a verdict and the subject was removed.** Across 200 seeds per position the reader and the blind twin finished in the same Round to two decimal places at `far` and `stay`, and the checkpoint clear rates were identical to the percentage point in all three positions. ADR 0026 had shipped the row against exactly this gate — "whether the row is actionable information or decorative UI" — and ADR 0031 deleted the row on the answer. The pair collapsed into a single `shover` policy, since with nothing to read the two were the same script.

This is the clearest case so far of a measurement earning its cost: the row survived a design review, a rewrite of the program order meant to fix it, and eight months of documentation, and no amount of argument moved it. One differential did.

What replaces it is `programPredictability`, which was built to justify the row and outlived it. With no forecast the number *is* the learning curve — `1` means the order is a fixed rotation and a second attempt teaches nothing, the uniform floor means experience buys nothing either, and the design wants the middle. It currently reads 66% against a 33% floor.

One honest limit, recorded rather than solved: no fixed policy can learn, so the sweep now measures the *floor* of every decision whose payoff depends on knowing what comes next — Fortify's banked Armor most of all — and never its best play. The instrument for that is a human playtest.

## Decision-Concentration Proxy

Decision concentration is one of the four required encounter metrics (D-027) and it is the only accountability accepted in exchange for rejecting face-down commitment (D-026). Its real instrument needs several humans, which the solo slice cannot supply — so measure a structural proxy now through the policy sweep rather than deferring the metric entirely:

> At the Round-4 checkpoint, does any single policy's action budget cover every live demand?

If it does, one player could quarterback the fight, and that is a finding available with no human playtest at all. This is the same shape as Tank Design Principle 4's existing test — by the checkpoint, at least one live demand the solo Hero had no economy to answer — so the proxy adds no new machinery, only a second reading of a sweep already run.

The human instrument — recording which player proposed or selected each significant response — becomes required the moment real Parties play, and supersedes the proxy rather than joining it.

## Minimal Engineering / Reporting Gaps

1. Add a scenario/run label to Encounter Records or the aggregate report command. **Implemented for Evidence Cohorts** through `EncounterRecord.begin(..., metadata = {})`.
2. Add report aggregation for boss damage dealt, damage prevented, Rounds survived, outcome by seed, and content fingerprint. **Implemented for fixed-seed cohorts** in the canonical aggregate report.
3. Add per-Round hand/Slot summaries sufficient for dead-draw, charge-efficiency, and Slot Tension proxies. **Implemented as raw Hand/Slot/legal-useful-action/selected-action rows**, leaving interpretation to Design.
4. Add board-pressure facts for Minion clears and Hazard answers only when those rules are supported by `EncounterEngine`.
5. Keep human play-feel rubric storage as Markdown notes; no HUD changes and no analytics backend.

## Acceptance For The Backlog Item

The first implementation pass is complete when QA can run one command or short documented sequence that:

- creates fixed-seed Encounter Records for the current deck;
- produces an aggregate report with viability basics;
- links the report to a completed human rubric note under [deck-eval-notes](deck-eval-notes/);
- leaves existing probes green.

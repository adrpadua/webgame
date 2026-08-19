# Spec: Fun-Proxy Evaluation — Automated Play-Feel Metrics on the Headless Sweep

Status: ready-for-agent
Date: 2026-08-19
Origin: design conversation on measuring "fun" by simulation; seam choice (a single new evaluation module) confirmed by the user.
Context: the evaluation sweep (`npm run evaluate`), the [deck-evaluation rubric](../../docs/content/deck-evaluation-rubric.md), the [measurement plan](../../docs/artifacts/deck-evaluation-measurement-plan.md), ADR 0009 (headless rules SDK), ADR 0010 (probe support stays outside the Encounter Engine), ADR 0012 (seeded randomness for replay), ADR 0018 (manifest-driven probe suite), D-016 (solo victory is a red flag), D-027 (evidence metrics with named laws).

## Problem Statement

Fun cannot be measured directly, but its absence can — and today the project discovers un-fun only by accident or by spending scarce human playtest time. Twice already, a proxy metric found a play-feel defect before any human named it: the controlled cohort caught the Riposte payoff converting in one seed of three (driving D-015 and later the Signature design), and the economy simulation caught the elastic refill taxing exactly the planning behaviour the telegraphed Boss Timeline exists to invite. Both instruments were built ad hoc, after the fact.

The evaluation sweep measures Viability (survival, damage, checkpoint rates, the D-016 red flag) but nothing about how a run *felt*: whether decisions mattered, whether the outcome was decided early, whether earned payoffs converted, whether a loss had any saving line. Every design change — including the pending Signature migration — currently reaches the human feel pass without a structural filter, so human playtesting minutes are spent discovering defects a bot could have proven.

## Solution

Extend the headless evaluation stack with a family of automated **fun-proxy metrics**: computable quantities that reliably detect named un-fun (rote play, meaningless choice, early-decided outcomes, evaporating payoffs, dead windows, predetermined losses, no mastery headroom) and weakly indicate its preconditions. The metrics ride the existing deterministic, seeded Encounter Engine and the Resolution Facts stream; they are delivered in three phases:

1. **Instrument what already runs** — tension curve (win-probability per Round and Round-of-decision), payoff conversion per authored earn/spend loop, end-margin distributions, and dead-window rate, added to the existing policy sweep with no new bots.
2. **The policy ladder and counterfactual replay** — graded-sophistication bots (random-legal → greedy → the existing scripted policies) measuring mastery headroom, and seeded branch-replay of losses measuring the saving-line rate (agency).
3. **The play-feel scorecard** — aggregation into red-flag findings in the D-016 style, with authored thresholds, gating what reaches human playtesting without ever replacing it.

The metrics are falsifiers, not objective functions: a build that fails them is structurally un-fun; a build that passes has merely earned its human feel pass.

## User Stories

1. As a game designer, I want a per-Round win-probability estimate for each policy and seed, so that I can see whether an encounter stays uncertain deep into its clock or is decided in the opening Rounds.
2. As a game designer, I want a Round-of-decision metric (the Round where estimated win probability crosses a high/low threshold and never returns), so that I can quantify how much of the encounter is execution theater after the outcome is settled.
3. As a game designer, I want payoff-conversion rates for every authored earn/spend loop (earned → cashed → expired), so that a payoff that silently evaporates — the original Riposte defect — is caught by the sweep instead of by a human playtest.
4. As a game designer, I want end-margin distributions (Boss health remaining at defeat, Hero health remaining at victory or enrage), so that I can tell near-miss losses from hopeless ones and tune toward drama rather than averages.
5. As a game designer, I want a dead-window rate (the fraction of player windows where the legality projection offers no productive action), so that hands with nothing worth doing are measured rather than anecdotal.
6. As a game designer, I want a mastery-headroom report comparing outcome quality across a ladder of policy sophistication, so that I can verify skill pays (each rung beats the one below) while the floor stays humane (the weakest rung still reaches the Round-4 checkpoint at a reasonable rate).
7. As a game designer, I want a saving-line rate over losing runs (the fraction of losses where some alternative legal line at some decision point would have materially improved the outcome), so that "nothing I did mattered" losses are detected as the authoring defect D-022's philosophy names them to be.
8. As a game designer, I want saving lines in the solo slice defined against checkpoint attainment and survival quality — never against Boss defeat — so that the agency metric respects D-016 instead of rewarding the exact outcome the design forbids.
9. As a game designer, I want line-diversity measures across seeds under one policy, so that I can tell whether the seeded Boss program order (ADR 0028/0031) actually produces different play or every run collapses into one script.
10. As a game designer, I want every metric reported per policy as well as aggregated, so that a defect visible only under one plan (the turtle stalling, the culler starving) is not averaged away.
11. As a product manager, I want the scorecard to emit named red-flag findings with authored thresholds in the D-016 style, so that "Round-of-decision ≤ 3 in 40% of seeds" blocks promotion the same way a solo Boss kill does.
12. As a product manager, I want the scorecard attached as evidence to the deck-evaluation rubric's Play-feel axis without replacing the human feel pass, so that human scores remain the promotion gate and the sweep merely filters what earns one.
13. As the orchestrator, I want identical CLI invocations to produce byte-identical reports (all randomness derived from run seeds per ADR 0012), so that findings are reproducible evidence rather than observations.
14. As the orchestrator, I want the new metrics added as columns alongside the existing sweep metrics with policy identities unchanged, so that every historical cohort remains directly comparable to new runs.
15. As a test-automation agent, I want the metric computations exposed as pure functions over a recorded encounter trace, so that each metric has focused Vitest coverage on constructed traces without running full sweeps.
16. As a test-automation agent, I want a probe-suite entry with a declared success marker for the metrics smoke run (ADR 0018), so that CI proves the instrument itself still works.
17. As a future Hero author, I want payoff-loop detection driven by the Counter/fact-stream vocabulary rather than a hard-coded loop list, so that a new authored earn/spend loop (the Signature's earned Charges included, once its facts exist) gets conversion metrics without instrument changes.
18. As the evaluator of the Signature migration, I want a before/after fun-proxy comparison against the existing Riposte baseline cohort, so that the migration's evaluation gate can cite tension, conversion, and agency evidence, not only Viability numbers.
19. As a human playtester, I want my session time reserved for builds that passed the structural filter, so that I spend feel-pass minutes on questions only a human can answer.
20. As a repo maintainer, I want the scorecard's documentation to state the Goodhart guard explicitly — metrics falsify, they are never tuning targets — so that a future change is never justified by "it improved the fun score."

## Implementation Decisions

- **One new seam: an evaluation module outside the Encounter Engine.** Per ADR 0010 the engine gains no evaluation code; per ADR 0019 the module consumes only the engine's public surface (state construction, action resolution, phase advancement, the legality projection, and Resolution Facts). The existing sweep CLI and the scenario generator become thin adapters over this module. Its public surface is three pure capabilities: run a policy from an arbitrary encounter state, collect a trace (per-phase state snapshots plus facts) for a seed and policy, and compute metrics from a trace plus rollout results.
- **Policy extraction, identity-preserving.** The scripted policy currently inlined in the sweep becomes a step function callable from any mid-encounter state — the one refactor everything else depends on, since win-probability rollouts and counterfactual replay must start mid-Round. The existing policy knob vocabulary (slot plans, position, spike) and policy identity strings are preserved exactly so historical cohorts stay comparable.
- **Determinism is a contract.** Every rollout and replay branch seeds a deterministic derivation of the run seed (ADR 0012). Identical invocations produce identical reports; a report is reproducible evidence.
- **Win-probability estimation** uses Monte Carlo rollouts from each Round's start state, played by the existing policy ensemble (no new bots in Phase 1), with the rollout count a CLI knob with a documented default. "Win" for the tension curve in the solo slice is graded outcome quality (checkpoint, survival depth, enrage-versus-health-death), not Boss defeat alone, consistent with D-016.
- **Round-of-decision** is the first Round whose estimated outcome probability crosses an authored high/low band and never re-enters it; the band is a scorecard threshold, not a code constant.
- **Payoff conversion** is computed from Counter events in the Resolution Facts (placed, consumed, expired), grouped per Counter identity — no hard-coded loop registry, so authored loops are covered automatically. Loops whose facts do not yet exist (the Signature's earned Charges) are covered when their events land.
- **Dead windows** are player windows in which the engine's legality projection offers no productive action (nothing beyond advancing the phase). This uses the existing legality seam and requires no rollouts.
- **The policy ladder (Phase 2)** adds two cheap rungs below the scripted policies: uniform-random over the legality projection, and a one-step greedy. Mastery headroom is the outcome-quality delta between adjacent rungs; the floor requirement is expressed as a scorecard threshold on the bottom rung's checkpoint rate.
- **Counterfactual replay (Phase 2)** branches a losing run at each player-window decision point, substitutes alternative legal actions under a bounded branch budget, and replays deterministically to terminal. The saving-line rate is the fraction of losses with at least one branch materially improving the outcome, where "improving" uses the same D-016-respecting graded scale as the tension curve.
- **The scorecard (Phase 3)** aggregates metrics into findings against authored thresholds, emitted in the same red-flag style the sweep already uses for solo kills. Thresholds live as authored configuration, not code constants. The scorecard document states the two standing caveats: bots under-perform and over-perform humans in known ways (the sweep already records this for Ripostes), and metrics are falsifiers — tuning to them is prohibited (the Goodhart guard).
- **Report output** extends the existing sweep table and JSON output; per-policy first, aggregate second, distributions reported as quantiles rather than means where the shape is the finding (end margins).
- **Performance budget:** rollout-based metrics are the expensive path; the default configuration must keep a full sweep practical on a developer machine, with depth knobs for CI-scale runs.

## Testing Decisions

- **Test external behaviour only:** metrics are pure functions over traces, so tests construct minimal traces (or replay small fixed-seed encounters) and assert metric values — never the internals of trace collection or policy stepping.
- **Golden determinism tests:** for a small set of fixed seeds and policies, the full metric report is asserted stable across runs; any diff is a real behaviour change. Prior art: the engine test suite's seed-deterministic encounter tests and the committed-Scenario generator's regeneration checks.
- **Per-metric unit coverage** on constructed traces: a trace with an earned-then-expired Counter proves conversion counts an evaporation; a trace with an empty-hand Quick Window proves a dead window; a two-branch replay fixture proves the saving-line rate counts a checkpoint-improving branch and ignores a Boss-kill branch (the D-016 nuance is a test case, not a comment).
- **Ladder sanity tests:** on fixed seeds, the random rung never outperforms the scripted rung on checkpoint rate — asserting the instrument's own validity, not the game's balance.
- **A probe-suite entry** (ADR 0018) runs a minimal-depth sweep and declares a success marker, so both adapters' CI catches instrument rot.
- **What is deliberately not asserted:** absolute metric values against design targets. The instrument ships neutral; thresholds are scorecard configuration exercised by Phase 3 tests as configuration, so tuning debates never require test edits.

## Out of Scope

- Any change to game rules, the Encounter Engine's behaviour, card content, or encounter tuning — this spec builds the instrument; acting on its findings is separate, decision-gated work.
- The Signature Slot migration itself (its own settled proposal); this instrument should be *ready* to evaluate it, but does not depend on it or block it.
- Replacing the human feel pass or the deck-evaluation rubric's promotion gate; the scorecard feeds evidence into the existing gate.
- Machine-learned or search-heavy agents (MCTS, RL); the ladder's rungs are scripted, cheap, and deterministic by design.
- Multi-Hero party evaluation; the instrument targets the current solo slice and should be re-examined when the Party model exists.
- UI or Workbench surfacing of the metrics; this is a headless tool with table/JSON output.
- Automated Boss-side authoring feedback (telegraph lead-time analysis and similar); worth a future spec once the player-side instrument proves out.

## Further Notes

- The three-phase order is dependency-driven: Phase 1's trace/rollout plumbing (and the policy-from-any-state refactor) is what makes Phase 2 cheap, and Phase 3 is pure aggregation over 1 and 2. Each phase lands independently useful.
- The proxy catalog's intellectual frame, for whoever implements: automated metrics detect un-fun reliably and fun only weakly. The two prior in-repo successes of this method (the Riposte 1-in-3 conversion finding; the elastic-refill planning-tax finding) are the calibration examples — both were proxy measurements that predicted a feel-pass conclusion.
- D-027's discipline applies: every scorecard finding should name the law it rests on ("payoffs that evaporate feel bad", "outcomes decided early make later play theater") so a finding is an argument, not a number.
- Historical comparability is a hard requirement because the Signature migration's evaluation gate explicitly cites before/after comparison against the existing Riposte baseline cohort.

# Evaluate Posture Deck Impact

Status: resolved
Owner: Game Design and QA Automation
Blocked by: none

## Outcome

Run three controlled, human-reviewed Elian Voss encounters using the approved deck-evaluation rubric and comparable Encounter Records to decide whether Riposte Ready improves Shield Wall identity and Slot Tension without creating an always-Shield-Slam pattern.

## Canonical Sources

- `docs/content/deck-evaluation-rubric.md`
- `docs/artifacts/deck-evaluation-measurement-plan.md`
- `docs/artifacts/deck-eval-notes/`
- Approved product issue and completed implementation evidence

## Acceptance

- Viability at least `3/5`;
- Play-feel at least `3/5`;
- meaningful Slot decisions in most post-Loadout Rounds;
- no dominant always-Shield-Slam sequence across all three runs;
- human notes link the corresponding cohort/report evidence.

## Non-Goals

No expanded-deck promotion before evidence, automatic play-feel score, broad seed sweep, analytics platform, or balance change hidden inside measurement.

## Comments

- 2026-08-13: Issue 05 is the active remaining Combat Postures gate, but Design and QA independently agree the accepted recommendation packet is currently blocked by documented deck-evaluation evidence gaps. The missing path is exactly `docs/artifacts/deck-evaluation-measurement-plan.md` gaps 1 through 3: named scenario/run labels, deck-evaluation report grouping by fingerprint and seed, and the per-Round Hand/Slot/legal-useful-action/selected-action evidence needed for meaningful-choice and dominant-line scoring. No default-deck/content/teaching-pacing change is authorized while this blocker stands. Next step: QA returns the smallest report/scenario evidence unblocker and routes Architecture only if a record/report seam must deepen.
- 2026-08-13: QA returned the unblocker packet and confirmed Architecture must re-enter. The smallest accepted path is the existing Evidence Cohort pair plus a focused `deck_eval_baseline` evidence path: extend `EncounterRecord.begin(..., metadata = {})` only with `run_label`, `evaluation_purpose`, and `scenario_id`; capture one normalized observation per distinct Round/phase boundary with the minimum Hand/Slot/selected-action and useful-action proxy evidence needed for issue 05; add pure cohort reporting grouped by unchanged fingerprint + run label + seed + evaluation purpose; and emit the fixed labels `baseline-a`, `baseline-b`, and `baseline-c` through the canonical report flow. QA remains the independent verifier; Design remains the bounded user of the final cohort/report packet.
- 2026-08-13: Architecture implemented the bounded Evidence Cohort unblocker without live content/deck/seed/starting-hand/pacing changes. `deck_eval_baseline` emits `baseline-a`, `baseline-b`, and `baseline-c` from live Embermaw prototype content with probe-local seeds `1337`, `7331`, and `20260813`; Encounter Records now carry the accepted metadata and `phase_observations`; the canonical aggregate report groups cohorts by fingerprint + run label + seed + evaluation purpose and renders raw viability plus per-Round Hand/Slot/legal-useful-action/selected-action rows. This is evidence for Design/QA review only, not an automatic issue-05 recommendation.
- 2026-08-13: QA independently passed the fixed-seed Evidence Cohort/report packet. Design reviewed the three human-readable records and recorded the recommendation in `docs/artifacts/deck-eval-notes/2026-08-13-elian-voss-baseline.md`. Result: FAIL for promotion or tuning purposes. The live two-card baseline reaches qualifying Riposte Ready grants but contains zero Shield Slam copies, so it cannot evaluate the payoff or prove that Shield Slam is non-dominant. Viability is `2/5`; Play-feel is `1/5`; no live deck/content/seed/starting-hand/teaching-pacing change is authorized or inferred.
- 2026-08-13: QA independently verified the Design note against the fixed-seed report, rubric, and measurement plan. PASS: all three labels/seeds and the single fingerprint match; prevention totals and repeated selected-action patterns support the stated scores; zero Shield Slam is correctly treated as untestable rather than passed; Whelp/Slow remain supporting-contract context; no unauthorized follow-up was proposed. The negative recommendation completes the evaluation gate. Any future controlled-deck cohort or live-content change must enter through PM/user approval.
- 2026-08-13: Closure framing confirmed: this negative recommendation is a limitation of the unchanged live baseline cohort, not a Combat Postures implementation defect. Riposte Ready passed engine, production-resource, UI, Encounter Record, and QA validation. The baseline lacks Shield Slam, Sweeping Blow, and Fortify, so it can evaluate only the defensive trigger—not the payoff or expanded deck machine.

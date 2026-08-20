# Counter-Pressure Against Boss-Range Camping

Status: shipped (D-017, 2026-08-17); premise amended (D-073, 2026-08-19)

## Player Problem

The Encounter Workbench's policy search found the dominant Embermaw line on
its first seed: park Elian Voss at hex distance 3 — outside the range-2
Cinder Breath cone, where only Raking Claw still lands — and run two Steady
Strike slot engines to a Round 6 victory with 10 Health to spare.

This is legal by ratified rules: `boss_damage` resolves without a range
check (`docs/rules/prototype-rules.md`, Targeting), and the 2026-08-16
grilling ruled that positionless `boss_damage` stays. But a tank fantasy
where the best play is standing as far from the Boss as the board allows
undercuts the Shield Wall identity (claim dangerous space, hold the Guarded
Front) and drains Slot Tension of its positional half.

## Desired Outcome

Playing at maximum distance from Embermaw is a real trade-off rather than a
strictly dominant line, delivered through authored encounter content — not
a card range rule. The tank should *want* to hold the front because the
encounter rewards it or punishes absence, preserving the ruled positionless
`boss_damage`.

## Evidence

- `data/scenarios/embermaw_victory_line.json` — the committed distance-3
  victory line (policy search, seed 1, `dual_steady` + `far` knobs).
- `notes/encounter-workbench-m1-working-note.md` §10 — the finding and the
  grilling ruling that counter-pressure is content work.
- `web/scripts/generateScenarios.ts` — the search that rediscovers the line
  on demand; any candidate counter-pressure can be evaluated by re-running
  it and checking whether `far` still dominates `stay`.

## Open Product Decisions

- Which counter-pressure mechanism fits Embermaw's identity: boss movement
  or pursuit toward the Hero, longer-range or board-wide beats that punish
  distance, a beat that intensifies while no Hero holds the Guarded Front,
  or something else entirely?
- Should the counter-pressure land as a fourth Boss Program, edits to the
  existing three, or a new Beat kind (which would touch the engine)?
- What is the acceptance bar: "the policy search's `far` position no longer
  beats `stay` on most seeds", or a softer design-review judgement?

## Risks And Dependencies

- A mechanism needing a new Beat kind expands the Encounter Engine and its
  content schemas; a program/beat-values-only mechanism ships as pure JSON.
- Changing the encounter re-baselines the committed victory and Round-3
  Scenarios; they regenerate via the existing generator script.
- Depends on the Encounter Workbench branch (PR #3) landing, since the
  evaluation loop is the policy search and Scenario replay it introduced.

## Approval Record

On Saturday, August 16, 2026, a grilling session ruled `boss_damage`
range-free and directed that counter-pressure against boss-range camping be
filed as a product proposal with the mechanism left open for shaping. PM
holds this at `needs-triage` until the user picks a mechanism direction and
acceptance bar.

On Sunday, August 17, 2026, the user directed the fix. Mechanism chosen and
shipped as D-017: Raking Claw intensifies (+3 `unguarded_bonus`) when no
Hero holds the Guarded Front at resolution, and Embermaw's solo-slice
health rose from 36 to 48 to close the dodge-racer line the red-flag search
surfaced. `boss_damage` remains positionless. Acceptance evidence: the
12-policy evaluation sweep reports 0% solo victory and 0% enrage survival
across all positions (previously 97% victory for `dual_steady/far` and
100% enrage survival for `sword_shield/far`); the Scenario generator now
exits red-flag on any found solo victory, and the committed
`embermaw_solo_ceiling` Scenario replaces the retired victory line.

On Wednesday, August 19, 2026, the user reported the underlying premise as a
bug rather than a ruling: Steady Strike reads as a melee swing and fired from
several hexes away in the Workbench. D-073 gives every card a `range_tiles`
reach — the Boss included — and authors the melee vocabulary at `1`, so
`boss_damage` is no longer positionless. The counter-pressure this issue
shipped is not undone by it: the unguarded bonus and the raised solo health
still price standing off the Guarded Front and racing the clock. What the
reach adds is that camping at distance is no longer a damage plan at all —
every `far` policy in the 48-policy sweep now deals exactly zero Boss damage,
where `dual_steady/far` averaged 16.6.

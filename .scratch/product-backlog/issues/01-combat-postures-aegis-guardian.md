# Combat Postures for Hero Roles: Aegis Guardian First Slice

Status: ready-for-agent

## Player Problem

Captain Elian Voss can risk a repetitive pattern of firing an attack every Round. The current Shield Wall fantasy establishes the correct Tank Hit and Guarded Front response, but does not yet turn a perfectly mitigated hit into a distinct later opening. That weakens both Slot Tension and the feeling that disciplined tank play creates value for the Party.

## Desired Player Outcome

The player can claim the **Guarded Front**, mitigate a Boss **Tank Hit** with zero Health loss, and visibly gain a short-lived, non-stacking **Riposte Ready** posture. The player then decides whether and when to use **Shield Slam** to consume that posture for an authored payoff.

The player-facing promise is: “I handled the mechanic correctly, and that created our opening.” This improves role gameplay by making the Shield Wall's defensive responsibility a visible setup for a bounded offensive or tactical payoff, rather than rewarding generic attack repetition.

## First Slice

- Applies only to the Aegis Guardian / Captain Elian Voss.
- Only a Boss Beat authored as a Tank Hit can grant Riposte Ready. Hazards, Minion damage, and other incidental damage cannot grant it.
- When that Tank Hit resolves against Elian, grant Riposte Ready only if Elian is in the Guarded Front and takes `0` Health loss from that hit.
- Riposte Ready is non-stacking and does not refresh. It lasts through the first Quick Window after the qualifying hit, then expires at the end of that window.
- A legal Shield Slam automatically consumes Riposte Ready and deals `2` additional Boss damage.
- The player can see the posture, its trigger reason, its expiry, and its consumption.
- Encounter Records capture the posture lifecycle and its relevant resolution facts.

## Scope

This proposal defines the player value and first-slice boundaries for a bounded, temporary combat posture. It requires a reusable capability that can express:

- a temporary Status Effect on a Hero;
- a trigger based on a resolved Tank Hit, Guarded Front condition, and zero Health loss;
- a visible expiry boundary and an explicit consumption event; and
- durable, normalized record facts for trigger, expiry, and consumption.

This is a dependency statement, not an implementation prescription. Architecture, Game Design, UI/UX, and QA must agree on the minimal generic event, status, and board-condition contract before delivery starts.

## Explicit Non-Goals

- A general Awakening system or a posture framework for every Hero.
- A new default resource meter or spendable Armor conversion.
- Multi-Hero Interception, ally targeting, or party-role implementation.
- Unbounded combo chains, repeated stacking, or a hidden passive bonus.
- Promotion of the expanded Elian test deck before scorecard evidence supports it.
- Replacing existing Armor, Guarded Front, Slot, or full-charge rules.
- Engine, UI, content, or probe implementation in this product proposal.

## Acceptance Evidence

Before this proposal can close as a delivered first slice, focused evidence must show that:

1. A Boss Tank Hit against Elian in the Guarded Front with zero Health loss grants exactly one visible Riposte Ready posture and records why it triggered.
2. A Tank Hit that fails either condition does not grant the posture.
3. Repeated qualifying hits do not stack or extend Riposte Ready beyond its confirmed rule.
4. An unconsumed posture expires at the end of the first Quick Window after its qualifying Tank Hit, including when that hit occurs in the Incoming Row; the player can understand its remaining window and Encounter Records preserve the expiry reason.
5. A legal Shield Slam automatically consumes Riposte Ready, deals its normal effect plus `2` Boss damage, visibly communicates the payoff, and records the consumption and resulting Resolution Facts.
6. The first-slice experience demonstrates a meaningful defensive-then-payoff decision without a new default resource, an unbounded chain, or a multi-Hero dependency.
7. Controlled deck evaluation measures whether the posture improves Shield Wall identity and meaningful Slot decisions without increasing repetition fatigue or promoting the expanded deck before the approved scorecard evidence exists.

## Affected Areas

| Area | Product impact |
| --- | --- |
| Design | Record Riposte Ready's confirmed player-facing rule, Shield Slam payoff, and deck role in the established canonical sources. |
| Architecture | Establish the smallest reusable event, Status Effect, board-condition, and Encounter Record contract consistent with canonical rules. |
| UI/UX | Present posture state, trigger reason, expiry, consumption, and authored payoff without creating a new rules authority or default meter. |
| QA | Define focused deterministic evidence for grant, non-grant, non-stacking, expiry, consumption, presentation, and Encounter Record facts. |
| Engineering Enablement | Only if a small shared authoring/validation contract is needed across Design, Architecture, UI/UX, and QA; keep it bounded to this workflow. |

## Canonical Documents To Consult Or Update

- [CONTEXT.md](../../../CONTEXT.md): Status Effect, Resolution Fact, Armor, Guarded Front, Tank Hit, Slot Tension, and any newly confirmed term or rule.
- [Aegis Guardian design](../../../docs/content/heroes/aegis-guardian-design.md): Shield Wall promise, Core Loop, Shield Slam intent, and controlled test deck.
- [Character Design Bible](../../../docs/rules/character-design-bible.md): Hero machine, Shield Wall role expression, complexity budget, and content approval checklist.
- [Deck Evaluation Rubric](../../../docs/content/deck-evaluation-rubric.md): viability, play-feel, Slot Tension, class-fantasy clarity, and repetition-fatigue evidence.
- [Project coordination ledger](../../../docs/artifacts/project-coordination.md): cross-role ownership, active work, and dependencies.
- Applicable ADRs, UI/accessibility contract, probe harness, and Encounter Record contract after the Orchestrator opens delivery planning.

## Confirmed Product Decisions

- **Riposte Ready** is an Aegis Guardian Status Effect. “Combat Postures” is the feature name, not a new general rules category.
- Only a Boss Beat authored as a Tank Hit qualifies. A qualifying hit must resolve against Elian while he occupies the Guarded Front and cause `0` Health loss.
- Riposte Ready is non-stacking and never refreshes. It expires at the end of the first Quick Window after the qualifying hit, whether that hit occurs in an Instant Row or an Incoming Row.
- A legal Shield Slam automatically consumes Riposte Ready and gains `2` additional Boss damage.
- The candidate cannot be promoted without the stated deck-evaluation evidence, including no dominant “always Shield Slam” sequence across three human-reviewed runs.

## Remaining Delivery Decisions

Product intent is fully specified. Delivery must propose the smallest generic event, Status Effect, board-condition, UI, Encounter Record, and focused-validation contract that satisfies this outcome without expanding into a general posture system or any stated non-goal.

## Risks And Dependencies

- The first slice introduces another Hero engine noun. It must remain visible, bounded, and easier to read than a resource meter.
- Existing Status Effect terminology permits temporary trigger-based rules, but the current canonical content does not yet commit a generic event, board-condition, visibility, expiry, consumption, or record contract for this loop.
- The active deck-evaluation effort is required to judge whether this reduces repetitive play rather than adding a mandatory attack pattern.
- The generic contract must not accidentally broaden into Interception, multi-Hero targeting, a generalized posture system, or a universal combo framework.

## Approval Record

The user approved this product outcome on 2026-08-13. This item is authorized for delivery planning only. The Orchestrator must acknowledge this exact path, create separate implementation tracking, preserve the confirmed outcome and non-goals, and route any material product-outcome change back to Product Management and the user.

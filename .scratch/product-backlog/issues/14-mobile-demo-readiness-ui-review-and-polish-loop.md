# Mobile Demo Readiness UI Review and Polish Loop

Status: needs-triage

## Player Problem

The prototype is gaining the right systems, but a newcomer can still hit moments where the mobile HUD is technically functional yet not immediately understandable, confidence-building, or demo-ready.

That problem is broader than any one button or one tutorial tip:

- a first-time player may not know what each visible object, word, icon, or button means in the moment;
- understanding can break differently across Loadout, Quick, Incoming, Slow, victory/defeat, and later rounds;
- isolated UI fixes can leave the overall experience feeling unfinished or inconsistent;
- the team can miss comprehension regressions if no one repeatedly reviews the real playable flow from a new-player perspective.

Without a deliberate review-and-polish loop, the prototype can remain "playable for insiders" instead of feeling like a presentable mobile game demo for someone seeing it fresh.

## Desired Outcome

After proposal 12's deterministic handoff/closure process is finished, run a bounded, repeatable newcomer-perspective UI review and polish loop that makes the mobile Embermaw prototype feel understandable, readable, and presentation-ready across the actual playable flow.

The player-facing promise is: a new player can play through the demo, look at each major phase and screen state, and generally understand what they are seeing, what matters now, and what to do next without the interface feeling broken, off-screen, or internally inconsistent.

## Scope

- Use repeated newcomer-perspective review passes on the real mobile playable flow after proposal 12 finishes.
- Capture screenshots from the meaningful visible states of the demo, including at minimum:
  - first loadout;
  - board state with telegraphed danger;
  - Quick Window;
  - Incoming/response state where relevant;
  - Slow Window;
  - at least one mid-encounter state after the opening tutorial moment;
  - terminal or checkpoint result states that a demo viewer is likely to see.
- Review each captured state for first-glance understandability of:
  - visible buttons and controls;
  - card/slot/board vocabulary;
  - status text and shorthand;
  - action hierarchy;
  - visual emphasis;
  - clutter versus signal;
  - mobile readability and safe presentation.
- Apply focused UI polish needed to make the prototype feel presentable as a mobile demo, while preserving approved gameplay and rules authority boundaries.
- Use the on-demand Playtester role for independent hands-on newcomer evidence whenever the activation gate is met.
- Prefer durable improvements to the UI system and presentation rules over one-off per-screen patching when the same problem repeats.

## Explicit Non-Goals

- No gameplay-rule, encounter-balance, deck-content, or pacing change unless separately approved.
- No silent merger with proposal 08 tutorial prompts, proposal 10 safe-bounds hardening, proposal 11 first-turn comprehension, or proposal 13 reusable modal work; delivery may depend on or reuse them, but must preserve their boundaries.
- No requirement to explain every advanced mechanic on first sight.
- No promise to make every future screen perfect in one pass.
- No analytics platform, automatic screenshot telemetry pipeline, or always-running idle review agent.
- No replacement of Test Automation or Playtester evidence with subjective implementation-owner judgment alone.

## Acceptance Evidence

Before this intake can close as delivered, evidence must show that:

1. The team has a bounded review loop for newcomer-perspective mobile UI passes that can be rerun during demo-readiness work.
2. A screenshot set or equivalent durable capture covers the agreed critical gameplay phases/screens of the mobile demo.
3. Each reviewed capture records concrete understandability findings rather than generic aesthetic impressions alone.
4. Resulting polish changes improve clarity, hierarchy, and presentation without moving required controls off-screen or creating HUD-only rules.
5. UI/UX and Test Automation verify that the polished demo remains within the established portrait layout, accessibility, and authoritative-state boundaries.
6. At least one independent newcomer-style hands-on pass or Playtester packet confirms that the demo is understandable enough to present without live coaching on every interaction.
7. The resulting demo reads as intentionally presented mobile game software rather than an internal prototype with unexplained UI leftovers.

## Affected Areas

| Area | Product impact |
| --- | --- |
| UI/UX | Owns readability, hierarchy, screen-state comprehension, visual polish, and cross-screen consistency. |
| Architecture | Preserves the boundary that UI improvements remain consumers of authoritative state rather than inventing rules or legality. |
| Test Automation | Verifies mobile-safe layout, accessibility, and reusable UI regressions introduced during polish. |
| Playtester | Supplies independent newcomer-perspective hands-on evidence for eligible player-facing claims. |
| Game Design | Clarifies player-facing vocabulary or teaching intent where UI confusion reflects a wording or concept problem rather than layout alone. |
| Product Management | Keeps the slice focused on demo-readiness and player comprehension rather than letting it expand into unrelated gameplay or content redesign. |

## Canonical Documents To Consult Or Update

- [CONTEXT.md](../../../CONTEXT.md)
- [Embermaw vertical slice](../../../docs/artifacts/embermaw-vertical-slice.md)
- [Accessibility contract](../../../docs/artifacts/accessibility.md)
- [Playtesting contract](../../../docs/agents/playtesting.md)
- [Project coordination ledger](../../../docs/artifacts/project-coordination.md)
- [08-contextual-mobile-tutorial-prompts-embermaw.md](08-contextual-mobile-tutorial-prompts-embermaw.md)
- [10-harden-mobile-layout-safe-bounds.md](10-harden-mobile-layout-safe-bounds.md)
- [11-improve-first-turn-loadout-comprehension.md](11-improve-first-turn-loadout-comprehension.md)
- [13-reusable-ui-popup-modal-surface.md](13-reusable-ui-popup-modal-surface.md)
- [12-deterministic-handoff-control-plane-and-closure-gate.md](12-deterministic-handoff-control-plane-and-closure-gate.md)

## Open Product Decisions

- What is the stop rule for "continuous passes" in this slice:
  - one bounded demo-readiness batch,
  - a fixed number of review/polish cycles,
  - or "continue until PM/user agree it is presentable"?
- What is the minimum required screenshot set: every Round, every phase/window, or only each distinct player-visible state?
- Does "presentable mobile game demo" for this slice mean:
  - primarily comprehension/readability polish,
  - or also broader visual polish such as transitions, surface consistency, and presentation tone?
- Should the first delivery focus only on Embermaw's current solo tank slice, or should it already cover any additional demo surfaces now in scope?

## Risks And Dependencies

- If this is treated as an open-ended polish bucket, it can absorb unrelated UI, content, or gameplay requests without a clear finish line.
- If screenshot review is not tied to concrete player-understanding questions, the work can drift into taste-only feedback.
- If direct polish work starts before proposal 12 finishes, the team may bypass the closure and handoff discipline the user explicitly asked to wait for.
- This slice depends on the current mobile presentation foundation from proposals 08, 10, 11, and 13 remaining distinct and reusable rather than being re-solved ad hoc.

## Approval Record

On Friday, August 14, 2026, the user requested follow-on work for after proposal 12 finishes: repeated newcomer-perspective UI review passes, screenshots of each phase/round, understandability feedback for displayed UI, and polish sufficient to make the prototype feel like a presentable mobile game demo. PM records this as a distinct post-proposal-12 demo-readiness proposal. It remains `needs-triage` until the user approves the finish rule and scope depth.

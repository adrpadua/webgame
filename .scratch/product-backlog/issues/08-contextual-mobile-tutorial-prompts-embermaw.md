# Add Contextual Mobile Tutorial Prompt Infrastructure and Embermaw Teaching Tips

Status: resolved

## Player Problem

Elian's loop now asks the player to notice and act on several time-sensitive ideas in a portrait mobile fight: the Boss Timeline, Guarded Front, charging Slots, Armor timing, Riposte Ready into Shield Slam, Slow commitment, and Whelp pressure.

Static rules text or a one-time tutorial dump is a poor fit for that learning problem. It front-loads too much information, teaches concepts before the board makes them meaningful, and risks leaving players unsure what mattered when the encounter actually asked for a decision.

## Desired Outcome

Add contextual in-game tutorial prompts for the mobile raid prototype so the player gets one short, readable, dismissible tip when an authoritative encounter state makes a concept relevant.

The player-facing promise is "learn by responding to the board." Guidance should appear at the moment of need, preserve portrait play readability, and reinforce the real mechanic without becoming a scripted mandatory tutorial flow.

## Scope

- Define a reusable tutorial-prompt model with:
  - `tip_id`
  - authoritative trigger condition or fact
  - priority
  - presentation anchor or surface
  - once-per-encounter or once-per-run policy
  - dismissal and completion state
  - accessible full-text fallback
- Keep trigger authority in `EncounterEngine` and its authoritative projections. The HUD may present a prompt, but it must not infer gameplay, create rules, or advance encounter state itself.
- Allow only one tutorial prompt at a time.
- Present prompts as a compact anchored callout or bottom-sheet-style surface that preserves portrait board and card visibility.
- Make prompts dismissible and add a persistent Help/Rules entry so previously shown guidance can be reopened.
- Keep prompts non-blocking by default. A prompt may protect the next required gesture only if UX evidence later proves that protection is necessary.
- Author the first Embermaw teaching prompt set around these moments:
  1. Boss Timeline: distinguish `Instant` and `Incoming` before Round 1.
  2. Guarded Front: point out the boss-front adjacent hex when a Tank Hit is telegraphed.
  3. Charge a Slot: show when Elian has a Loaded Top Card and a usable hand card.
  4. Iron Guard / Armor: show immediately before the first relevant Tank Hit.
  5. Riposte Ready: explain the temporary Shield Slam opening after a qualifying zero-Health-loss Tank Hit.
  6. Slow Window / Fortify: show only when Slow is legal and Fortify is relevant.
  7. Whelp pressure: show when a spawned Whelp blocks a meaningful route or creates a legal Sweeping Blow answer.

## Explicit Non-Goals

- No scripted, linear, mandatory tutorial sequence.
- No game-rule changes, HUD-only rules, default deck tuning, encounter pacing changes, or generic analytics backend.
- No player-facing target-pattern UI in this slice.
- No assumption that player Heroes need persistent mechanical facing; boss-facing mechanics remain a separate gameplay decision.
- No promotion of prompt exposure into gameplay facts, outcome inputs, or a substitute for Encounter rules literacy in canonical design docs.

## Acceptance Evidence

Before this intake can close as delivered, evidence must show that:

1. A deterministic scene-free or projected-state probe proves each authored tutorial trigger can emit once in its intended state and does not emit in an invalid or irrelevant state.
2. The tutorial-prompt model records the prompt's identity, authoritative trigger basis, priority, surface or anchor, show-once policy, dismissal/completion state, and accessible full-text fallback.
3. UI/UX verifies one-at-a-time prompt behavior, preserved board and card visibility at `390x844`, dismiss flow, reopen flow through Help/Rules, and accessible readable text.
4. The HUD remains a presentation adapter over authoritative encounter facts and does not infer gameplay, create legal actions, or advance rules state.
5. If Encounter Records capture prompt exposure, they do so only as clearly presentation-scoped metadata and never as gameplay facts or outcome inputs.
6. A hands-on new-player session shows that the authored prompt set improves comprehension of the listed Embermaw concepts without creating modal fatigue or obscuring the portrait combat surface.

## Affected Areas

| Area | Product impact |
| --- | --- |
| Game Design | Owns the teaching intent, concept ordering, trigger meaning, completion criteria, and player-facing learning goals for each prompt. |
| Architecture | Owns the authoritative trigger-fact boundary and preserves `EncounterEngine` plus projections as the only rules authority. |
| UI/UX | Owns mobile presentation, visibility preservation, dismissal and reopen flow, accessibility, and any validated need for protected interaction. |
| Test Automation | Owns deterministic trigger coverage and reproducible end-to-end prompt behavior evidence. |
| Engineering Enablement | Owns any reusable cross-role trigger/probe/report contract needed to keep tutorial prompting authoritative, testable, and lightweight. |
| Product Management | Keeps teaching scope separate from rules changes, encounter tuning, target-pattern UI, and any broader onboarding-system expansion. |

## Canonical Documents To Consult Or Update

- [CONTEXT.md](../../../CONTEXT.md): authoritative rules vocabulary for Boss Timeline, Guarded Front, Loaded, Armor, Riposte Ready, Slow Window, Encounter Briefing, and Encounter Record boundaries.
- [Headless Rules SDK](../../../docs/rules/headless-rules-sdk.md): `EncounterEngine` authority and scene-projection adapter boundary.
- [Probe harness](../../../docs/artifacts/probe-harness.md): deterministic probe expectations for rules, parity, mobile, accessibility, and focused player-visible contracts.
- [Embermaw vertical slice](../../../docs/artifacts/embermaw-vertical-slice.md): portrait HUD constraints, prompt placement context, Help surface, and visibility expectations.
- [Accessibility contract](../../../docs/artifacts/accessibility.md): target size, readable state communication, and accessible prompt/text expectations.
- [Embermaw prototype encounter](../../../docs/content/encounters/embermaw-prototype.md): current authored teaching moments, Boss Program flow, Tank Hit context, and Whelp pressure timing.
- [Elian Voss design](../../../docs/content/heroes/elian-voss-design.md): Elian's teaching promise for Hold, Brace, Riposte, Clear, and Slow commitment.
- [Project coordination ledger](../../../docs/artifacts/project-coordination.md): cross-role ownership, validation routing, and future delivery handoff tracking.

## Confirmed Product Decisions

- The first slice remains non-blocking and dismissible. No protected next-gesture behavior is approved in this slice.
- Show-once persistence uses a mixed policy by concept: foundational orientation prompts may be once per run, while reactive tactical opportunity prompts may be once per encounter as authored.
- First-slice prompt copy should be lightly instructional rather than purely explanatory or explicitly prescriptive.
- Help/Rules history should support both a text-first list for scanning and reopenable contextual-card versions of previously shown guidance.

## Risks And Dependencies

- This can drift into a scripted tutorial system if the "one prompt at a time" and "non-blocking by default" boundaries weaken during delivery.
- If the HUD infers triggers instead of consuming authoritative facts, tutorial messaging could diverge from real encounter behavior.
- If prompt surfaces overtake the portrait board or Hand, the feature could reduce understanding even while adding more guidance.
- The learning value depends on authored encounter timing already present in Embermaw; any later attempt to solve comprehension by changing deck, pacing, seed, or encounter order would be a separate product decision.
- Prompt exposure metadata must remain clearly presentation-scoped if recorded at all, or it risks muddying Encounter Record authority.

## Approval Record

On 2026-08-13, Game Design routed a user-requested PM intake for contextual in-game tutorial prompts after a completed design grill whose recommendations were explicitly accepted. Later on 2026-08-13, the user explicitly approved proposal 08 as written. This item is now `ready-for-agent`.

On Friday, August 14, 2026, the user accepted PM's recommended onboarding-policy answers: keep the slice non-blocking, use a mixed persistence policy by concept, make the copy lightly instructional, and provide both contextual-card reopen and a text-first Help history.

The Orchestrator must preserve the confirmed player outcome, non-goals, acceptance evidence, and authoritative trigger boundary; create separate delivery tracking outside the PM backlog; and return any product-outcome change, onboarding-scope expansion, tutorial-forcing change, or encounter/deck/pacing change to PM and the user.

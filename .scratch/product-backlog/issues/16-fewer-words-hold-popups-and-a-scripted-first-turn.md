# Fewer Words, Tap-and-Hold Popups, and a Scripted First Turn

Status: resolved

## Player Problem

The mobile HUD explains itself in prose. Coach prompts run a full sentence or two, the phase banner repeats itself in a hint line, Slots spell out `Drag or tap a card to prepare`, the player panel labels every number in words, and card text competes with all of it. A player holding a phone reads paragraphs where a mobile game would show a name, a number, and a colour.

At the same time, a new player's first Round is unguided: the prompts describe the systems but never walk one complete Round, so the vocabulary (prepare, charge, Quick, telegraph, Slow) has to be assembled by inference. And when something finally resolves, the board says almost nothing — a health number changes somewhere else on screen, with no motion tying the blow to the piece that threw it.

## Desired Outcome

The mobile prototype reads like a mobile game: short labels on the surface, detail on demand behind the gesture mobile players already know, one guided Round that teaches the loop by playing it, and visible feedback on the board when anything resolves.

The player-facing promise is: a first-time player can complete a whole Round without reading a paragraph, can press and hold anything they do not recognise to find out what it is, and can see who hit whom.

## Scope

- Cut on-surface prose across the HUD in favour of names, numbers, pips, and colour.
- Add one tap-and-hold Detail Popup surface, available on every named HUD object, holding the text that came off the surface.
- Add a Scripted First Turn: one guided Round covering prepare, charge, fire Quick, move out of a telegraph, and fire Slow, with input gated to one control at a time and a Skip control.
- Add Board Feedback for resolved actions: player and boss attacks, damage taken, guards, steps, spawns, telegraph resolution.
- Keep the rules, the authoritative-state boundary, and the accessibility contract intact.

## Explicit Non-Goals

- No gameplay-rule, timing, legality, or input-authority change.
- No change to the standard `embermaw_prototype` Encounter's deck, seed, or hand size.
- No replacement of the How to Play guide or the contextual coach prompts; both stay, shortened.
- No animation that gates input or that reports anything the Encounter did not resolve.

## Delivered

| Outcome | Where |
| --- | --- |
| Detail Popups on cards, Slots, boss beats, Hero stats, the Round track, and the boss bar, with a keyboard hold equivalent | `web/src/ui/HoldPopover.tsx`, `web/src/ui/holdDetails.ts` |
| Prose cut from the coach prompts, phase banner, Slots, Hand, player panel, top bar, targeting banner, replace confirmation, and How to Play guide | `web/src/ui/` |
| Scripted First Turn, derived from live Encounter state rather than a step counter, gating input and marking the live control | `web/src/ui/firstTurnScript.ts`, `FirstTurnCue.tsx`, `useFirstTurn.ts` |
| First Turn Encounter: the Ashen Trial with a five-card opening Hand and a fixed seed | `data/encounters/embermaw_first_turn.json` |
| Board Feedback derived from Resolution Facts: lunges, hit flashes with floating damage, guard pulses, step glides, spawn pops, telegraph flares | `web/src/board/effects.ts`, `web/src/board/BoardScene.ts` |
| Coverage: the scripted line, the derived effects, and the whole guided Round in the browser | `web/src/ui/firstTurnScript.test.ts`, `web/src/board/effects.test.ts`, `web/scripts/smoke.mjs` |

## Acceptance Evidence

1. `npm test` in `web/` passes, including the scripted-turn line assertion and the fact-derived effect assertions.
2. `node scripts/smoke.mjs` plays the entire scripted first turn in a browser — prepare, charge, fire Quick, dodge, fire Slow — then continues into ordinary Round 2 play, exports an Encounter Record, and replays it headlessly to an identical final state.
3. The smoke asserts the hold gesture opens and dismisses a Detail Popup.
4. `npm run lint` and `tsc -b` pass, including the engine-purity boundary rule.

## Confirmed Product Decisions

- Explanatory copy belongs behind a hold, not on the surface. The HUD carries names, numbers, and colour.
- The Scripted First Turn may gate input for its Round, which is a bounded exception to the non-blocking policy adopted for contextual prompts in proposal 08. It runs once, on a first visit, always offers `Skip`, and only ever gates toward actions the Encounter Engine would accept anyway.
- The scripted Round needs a five-card opening Hand, so it runs on an authored First Turn variant of the Ashen Trial rather than changing the standard Encounter's balance.
- Board Feedback is presentation only and is derived from Resolution Facts, never from intent.

## Risks And Dependencies

- A first-time player now plays a slightly different Encounter (five-card Hand) for their whole first session; a returning player opens the standard Encounter.
- Trimmed copy moves comprehension load onto the hold gesture. If a player never discovers holding, the surface must still carry enough: every hold target keeps its own visible name, number, and state, and the How to Play guide names the gesture.
- The scripted Round is pinned to authored content (seed, deck, opening Boss Program). `firstTurnScript.test.ts` fails if that content drifts.

## Approval Record

On Sunday, August 16, 2026, the user asked for fewer words in the UI in favour of the tap-and-hold popups mobile games use, for a scripted first turn covering load, charge, using an ability in both the quick and slow windows, and moving away from a boss attack, and for animation showing the player using a skill, attacking, and taking damage, along with the boss equivalents.

# Action bar turn structure sketch

Date: 2026-08-13

## Goals

- The game should feel like a scripted MMO raid rather than a normal alternating card battler.
- Players should act simultaneously in shared windows.
- The encounter should end by a visible `N-round` enrage timer.
- The player deck should support an MMO-style `Action Bar` where abilities are prepared and charged over time.

## Proposed encounter loop

Each encounter has a fixed or semi-fixed `Boss Timeline`:

- `Instant Row`: 3 visible boss actions that resolve first
- `Incoming Row`: 3 visible boss actions that resolve second

Each round:

1. Resolve `Instant Row` in slot order.
2. Party takes one shared simultaneous `Quick Window`.
3. Resolve `Incoming Row` in slot order.
4. Party takes one shared simultaneous `Slow Window`.
5. Discard resolved boss actions.
6. Promote / refill the boss timeline according to the boss script.
7. Advance the round count by 1.
8. If round count reaches `N`, trigger enrage.

This means enrage is simply:

- `Encounter ends after N rounds unless the boss is defeated sooner.`

## Why this loop is smoother

- Players only coordinate twice per round instead of after every boss card.
- The boss still feels scripted because its pressure is visible across two rows.
- `Quick Window` and `Slow Window` naturally separate basics from signature plays.
- The boss can threaten now and telegraph later in the same round.

## Boss script shape

The boss should be mostly scripted by `packages`, not pure random draws.

A package is a short authored pattern such as:

- `Turn and breath`
- `Whelp summon`
- `Tank buster into raidwide`
- `Spread check into collapse check`

Recommended structure:

- Build the boss script from 3-card or 6-card packages.
- Order packages deliberately for phase identity.
- Shuffle only within a small set if replay variation is needed.

This keeps the fight readable while still avoiding total repetition.

## Action bar sketch

Each player has:

- `2 Slots` at start
- possible growth to `3 Slots` later through progression

Each `Slot` contains:

- one `Top Card`
- one `Charge Stack`

The `Top Card` defines:

- speed (`Quick`, `Slow`, `Ongoing`)
- effect text
- charge cap
- range
- cast requirement, if any

Charged cards do not create separate abilities. They only modify the `Top Card`.

## Card uses

A hand card can be used in one of three ways:

1. `Prepare`: place it as the `Top Card` of an empty slot
2. `Charge`: slide it under an existing slot
3. `Cast`: use it directly if its rules allow direct firing

## Window identity

### Quick Window

`Quick` is for low-commitment tactical upkeep:

- basic attacks
- short movement
- basic defense
- resource gain
- interrupts
- small positioning effects
- add cleanup

### Slow Window

`Slow` is for spenders and class fantasy:

- tank mitigation payoffs
- redirects
- major strikes
- raid buffs
- holy burst / shield conversion
- cast-bar payoffs
- stance or ongoing setup

## Economy sketch

Each player has:

- `Tempo`: generic tactical budget for movement and basics
- `Class Resource`: role-specific spend resource

For the tank:

- `Tempo` pays for movement and basic actions
- `Guard` is the class resource

This is preferred over paying movement with the class resource, because it preserves class fantasy while still making positioning matter.

## Tank-specific combat model

The tank should answer a distinct category of boss pressure.

Boss damage should usually be tagged as:

- `Tank Hit`
- `Raid Hit`

This lets the tank feel essential without letting the tank solve everything.

Examples:

- `Tank Hit 7 to front target`
- `Raid Hit 3 to all players`
- `If a non-tank takes this Tank Hit, they are knocked out`

## Suggested first implementation seam

The deep module seam should be the `Encounter Timeline`:

- callers ask it to reveal, advance, and resolve boss rows
- the module owns round count, enrage progress, and boss package promotion

Second seam:

- `Action Bar`
- callers ask it to prepare, charge, and fire slots
- the module owns slot legality, charge caps, and cast readiness

These are the two systems most worth keeping deep and isolated before expanding the card set.

## Open questions

- What is the default `Tempo` per round: 2 or 3?
- Does charging cost `Tempo`, hand commitment only, or both?
- Do `Quick` cards fire immediately or can a slot itself be marked `Quick` and persist?
- Do cast-bar cards require one full window or one full round before they become ready?
- Is enrage a hard fail at round `N`, or a final scripted kill sequence that players may survive briefly?

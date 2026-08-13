# Embermaw Prototype Encounter

This document describes the current authored prototype encounter for `Embermaw`.

The intended full encounter is documented separately in [embermaw-ashen-trial-design.md](D:/dev/webgame/docs/content/encounters/embermaw-ashen-trial-design.md). This file records the current runnable short-deck implementation; it is deliberately smaller than the eight-round design.

## Purpose

`Embermaw` is the first encounter shell used to validate:

- a digital two-track Boss Program Card
- simultaneous player windows
- tank mitigation feel
- visible board facing
- telegraphed Whelp spawning and route blocking
- paid movement on the hex grid

## Current Board Setup

Starting board state:

- Player at `0,0`
- Embermaw at `1,-1`
- no Whelps; `Brood Call` telegraphs and then creates them

## Boss Identity

`Embermaw` currently runs a deterministic three-card looping Boss Program deck:

- `36` health, tuned as a reachable eight-round target for the tank deck
- **Hunt Pattern**: Turn to the Tank, Raking Claw, Ash Trail; then telegraphed Cinder Breath, Brood Call, Close the Lanes
- **Ember Pattern**: Stalk the Guardian, Cinder Breath, Ember Scar; then telegraphed Brood Call, Raking Claw, Keep a Safe Hex
- **Brood Pattern**: Turn to the Tank, Raking Claw, Ash Trail; then telegraphed Cinder Breath, Brood Call, Heat Rises

Each card has two simultaneously visible tracks. The three `Instant` beats resolve sequentially before the Quick Window. The three `Incoming` beats stay drawn on the board during Quick, then resolve sequentially before Slow. The loop is a compact playable demonstration, not the phase-two encounter design.

## Encounter Flow

The prototype uses the standard round structure:

1. `Boss Instant`
2. `Quick Window`
3. `Boss Incoming`
4. `Slow Window`

The authored program deck loops while the encounter remains active. The encounter ends when either combatant reaches `0` health, or when the clock advances beyond round `8`.

The live encounter configuration is [resources/encounters/embermaw_prototype.tres](D:/dev/webgame/resources/encounters/embermaw_prototype.tres). It owns the round limit and authored enrage text.

## Spatial Resolution

Boss damage is applied only when the player occupies a resolved board pattern:

- `Raking Claw` resolves a three-hex facing-based front arc and tests armor at the front line.
- `Cinder Breath` telegraphs a forward cone during Quick. Leaving the cone avoids the hit; resolved cone hexes become `Scorched` for one round.
- `Brood Call` telegraphs two edge spawn hexes in solo play, then creates Whelps there. Whelps occupy their hexes and constrain movement routes.

Scorched terrain cannot be entered voluntarily, so it persists as a tactical constraint rather than a hidden damage source.

## Design Intent

This encounter is meant to ask:

- Can the tank meaningfully stabilize incoming hits?
- Do quick basics and slow payoffs feel different enough?
- Does paid movement create real tempo tension?
- Is the boss timeline readable and useful?

## Current Gaps

- No phase break or boss transformation
- No Ashen Brand, Molten Tail, or Whelp end-step intent yet
- No explicit backstab or flank rules yet, only facing state

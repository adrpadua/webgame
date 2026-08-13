# Mechanical Pillars And Inspirations

This document records the external games that most strongly inform the current design direction of this repo.

Use [CONTEXT.md](D:/dev/webgame/CONTEXT.md) for canonical terms, [docs/adr](D:/dev/webgame/docs/adr) for decisions that are already locked in, and [docs/rules/prototype-rules.md](D:/dev/webgame/docs/rules/prototype-rules.md) for the currently playable rules.

The goal is not to clone any one game. The goal is to be explicit about which mechanical lessons are useful, and which surrounding assumptions should stay outside this project.

## Primary Pillars

### Into the Breach

Borrow:

- visible enemy intent and board-state readability
- positional problem solving where movement, pushes, and facing matter
- failures that feel like tactical misses rather than hidden-information gotchas

Do not borrow:

- tiny puzzle-board completeness where every turn has one near-perfect line
- short single-character ability text that assumes extremely abstract units
- mission-based roguelike structure

Why it fits this repo:

- The `Boss Timeline` already wants telegraphed pressure.
- The hex board becomes much more meaningful when positioning is part of the answer to authored boss mechanics.

Reference:

- https://thinkygames.com/games/into-the-breach/

### Spirit Island

Borrow:

- simultaneous player planning
- a clean split between `Quick Window` and `Slow Window`
- growth over time through persistent build-up rather than only hand churn

Do not borrow:

- wide multi-land macro management
- highly emergent adversary geography as the main difficulty source
- a large rules overhead around many token sub-systems

Why it fits this repo:

- The shared player windows are one of the clearest ways to make 2-4 player co-op feel like a raid instead of a queue.
- `Quick` and `Slow` timing gives class cards distinct jobs without requiring bespoke timing rules for every ability.

References:

- https://shop.greaterthangames.com/pages/spirit-island
- https://www.ultraboardgames.com/spirit-island/game-rules.php

### Sentinels of the Multiverse

Borrow:

- authored hero decks with strong class identity
- a distinct internal engine for every Hero: setup pieces, converters, payoffs, and recovery tools make a role feel learned rather than merely selected
- a mostly automated boss or villain script
- cooperative play where players bring different tactical roles to the same encounter

Do not borrow:

- fully non-spatial combat
- pure deck-silo interaction where the board is only status text
- long text density as the default way to express content
- unbounded reaction chains or exceptions that hide the base turn structure

Why it fits this repo:

- This project wants role kits that feel authored, not generic.
- A scripted boss deck that mostly runs itself is much closer to a raid encounter than a reactive enemy hand.
- The Action Bar and Charge Stack make a Hero's engine visible on a phone; range, facing, and telegraphs determine what that engine should do for the party.

Reference:

- https://shop.greaterthangames.com/pages/sentinels-of-the-multiverse

## Strong Secondary Inspirations

### Duelyst II

Borrow:

- card-driven tactics on a board
- meaningful adjacency, lanes of threat, and attack geometry
- combatants that matter as pieces, not only as card targets

Do not borrow:

- PvP collection structure
- mana-curve pacing as the primary progression model
- duel-arena symmetry

Why it fits this repo:

- It is a strong proof that cards and positional tactics can be one coherent rules layer rather than two separate games stapled together.

References:

- https://duelyst2.com/
- https://store.steampowered.com/app/2004320/Duelyst_II/

### Fights in Tight Spaces

Borrow:

- movement as part of card play rather than detached admin
- turns where positioning and ability choice are solved together
- concise tactical card presentation

Do not borrow:

- corridor or room-based map assumptions
- solo brawler pacing
- combo chaining that depends on disposable one-turn hands

Why it fits this repo:

- This repo uses a discarded hand card as immediate `Stamina` that pays for movement.
- It is a useful model for making board movement feel like a tactical resource decision instead of a free prelude to the real turn.

Reference:

- https://store.steampowered.com/app/1265820/Fights_in_Tight_Spaces/

## Mobile Execution References

### Dawncaster

Borrow:

- mobile-readable card layouts
- strong class identity with compact presentation
- high content ceiling without collapsing readability

Do not borrow:

- roguelike run structure as the default encounter wrapper
- purely hand-based combat with no board geometry

Why it fits this repo:

- It is a good benchmark for how much card complexity can fit on a phone if the UI is disciplined.

References:

- https://dawncaster.wanderlost.games/
- https://apps.apple.com/us/app/dawncaster-deckbuilding-rpg/id1555459868

### Stormbound

Borrow:

- mobile-first clarity for card-plus-board play
- short effect text with strong positional consequences
- a battlefield that remains readable on a small screen

Do not borrow:

- PvP ladder economy
- lane marching as the whole combat model
- real-time pressure

Why it fits this repo:

- It is a useful reminder that tactical board states on mobile have to stay legible at a glance.

References:

- https://paladinstudios.com/stormbound/
- https://play.google.com/store/apps/details?id=com.kongregate.mobile.stormbound.google

### Slice and Dice

Borrow:

- compact combat information density
- strong icon discipline
- quick turn resolution with readable synergies

Do not borrow:

- dice as the core action model
- run-based procedural structure

Why it fits this repo:

- It is an excellent mobile benchmark for how much tactical information players can process when the presentation stays clean.

References:

- https://play.google.com/store/apps/details?hl=en_US&id=com.com.tann.dice
- https://apps.apple.com/us/app/slice-dice/id6449848963

## Project Synthesis

The clearest one-line summary of the intended feel is:

- `Spirit Island` timing
- `Sentinels` class and boss authorship
- `Into the Breach` telegraphing
- `Duelyst` positioning
- `Dawncaster` mobile readability

In practice, this means:

- encounters should be readable before they are surprising
- player coordination should happen in shared windows
- boss pressure should arrive through authored packages, not generic AI turns
- position, range, and facing should matter every round
- card text and board state should remain legible on a phone-sized screen

## Explicit Non-Goals

These references are useful, but this repo is not trying to become:

- a collectible PvP card battler
- a pure roguelike deckbuilder
- a perfectly deterministic puzzle game
- a heavy simulation wargame
- a boardless co-op card engine

The target is a cooperative fantasy raid tactics game where authored boss mechanics and persistent player planning create the main tension.

# Embermaw Boss Script

This file records the current prototype boss script for `Embermaw`.

For the approved spatial-pattern successor design, see [embermaw-ashen-trial-design.md](../encounters/embermaw-ashen-trial-design.md). This file intentionally records only the current runnable script.

The live resource files are in [resources/boss](../../../resources/boss).

## Script Loop

The prototype currently loads these boss actions in order:

1. `Raid Opening`
2. `Tail Whip`
3. `Ember Breath`
4. `Brood Call`
5. `Crushing Bite`

After the final entry, the script loops back to the start.

## Action Notes

### Raid Opening

- Purpose: simple opening tank check
- Current effect: `4` Tank Hit

### Tail Whip

- Purpose: mix direct pressure with front disruption
- Current effect: `3` Tank Hit, `1` Raid Hit, plus `1` cleave damage to front enemies

### Ember Breath

- Purpose: party-pressure preview
- Current effect: `6` Raid Hit

### Brood Call

- Purpose: add-pressure beat
- Current effect: summon `2` minions

### Crushing Bite

- Purpose: heavy hit plus boss recovery
- Current effect: `5` Tank Hit and `2` boss healing

## Intent

This script is still prototype-grade. It is mainly here to give the player:

- readable future information
- mixed pressure types
- a reason to care about both survival and board control

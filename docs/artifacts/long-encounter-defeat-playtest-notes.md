# Long Encounter Defeat Playtest Notes

Date: 2026-08-13

Objective: play until the boss kills the player or the turn timer runs out, move at least 3 times, and attack at least 3 times.

## Result

Completed.

The long playtest ended in defeat by boss damage:

- Outcome: `defeat`
- Reason: `Elian Voss falls.`
- Final turn reached: 8
- Moves completed: 3
- Boss-damaging action-bar attacks completed: 3
- Player HP: 0
- Boss HP: 29

## Route

The scripted playtest used real encounter state and authored cards.

- Moved from the starting hex to `0,-1`.
- Loaded and activated `Steady Strike`.
- Advanced through boss incoming and slow.
- Loaded and activated `Unyielding Step`.
- Reached Round 2 Quick.
- Moved to `-1,0`.
- Loaded and activated `Shield Slam`.
- Reached Round 3 Quick.
- Moved to `-1,1`.
- Continued advancing phases until the boss defeated the player.

## Evidence

- `LONG_ENCOUNTER_PLAYTEST_OK outcome=defeat reason="Elian Voss falls." turns=8 moves=3 attacks=3 activated=Steady Strike,Unyielding Step,Shield Slam player_hp=0 boss_hp=29 phase_advances=14`
- `PLAYTHROUGH_SMOKE_OK`
- `MOBILE_PLAYTEST_OK`
- `ACCESSIBILITY_PROBE_OK`

## Hiccups Fixed

No game-code blockers prevented completion.

The only hiccup was in the new long-playtest probe: Godot could not infer one local variable type, so the probe now uses an explicit `bool` for the prepare result.

## Follow-Up Notes

The encounter can be completed to a defeat state, but the long route reinforces one design question: action-bar top cards persist after activation and can be reused in the same matching window if energy permits. That may be intended for this prototype, but it makes long-run balance heavily depend on energy rather than card consumption.

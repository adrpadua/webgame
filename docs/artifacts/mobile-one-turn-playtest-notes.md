# Mobile One-Turn Playtest Notes

Historical artifact: this predates card-fueled Stamina and the current direct-manipulation controls.

Date: 2026-08-13

Build: local Godot prototype in `D:\dev\webgame`

Viewport: 390 x 844 portrait mobile layout

## Result

I was able to get through one whole turn.

The verified path reached:

- Round 1 Quick
- Boss Incoming
- Round 1 Slow
- Round 2 Quick

Evidence:

- `PLAYTHROUGH_SMOKE_OK`
- `MOBILE_PLAYTEST_OK`
- Rendered screenshots:
  - `tmp/mobile-action-prompt.png`
  - `tmp/mobile-continue-prompt.png`
  - `tmp/mobile-ui-playtest.png`

## What Worked

The top prompt made the first action understandable. When a card was loaded, "Action ready. Tap the loaded slot." gave me a clear next step.

The loaded action-bar cards read much better with artwork than they did as plain text buttons. They feel like real queued cards now, and the borders make the two slots easy to distinguish.

The no-plays state is now much clearer. Seeing "No plays left. Tap >." plus the highlighted button near the turn tracker gives me a concrete exit action instead of making me infer that the tracker itself is the button.

Tempo placement is good. It is visible above the action bar, and the `-1` spend indicator is easy to notice after movement.

Tap-to-move works once I understand that I need to tap the player first. The gold destination highlight is readable, and the tempo spend feedback confirms the cost.

The tile info HUD is useful when it appears. The top placement keeps it out of the hand/action-bar zone.

## Friction

The board is still visually noisy for a first-time player. The playable units and important tiles are readable, but the dungeon backdrop and many empty hexes compete with the action bar for attention.

The turn tracker itself is still cryptic. The pips communicate progress once I know what they are, but on first read I do not immediately know that the bottom row represents the round/phase track.

Card type abbreviations help, but they still ask for decoding. `DMG`, `GRD`, and the icons are compact and functional, but a new player may not know the full category names unless they long-press or infer from the card title.

The prompt "Tap Player to move" depends on knowing that the player tile is tappable. The highlight after tapping is good, but before that the player piece does not strongly advertise itself as the movement handle.

The action bar has a nice art treatment when loaded, but empty slots are still fairly abstract. I could tell they were slots, but not immediately which one should receive a card or whether slot order matters.

## Notes For Next Iteration

Make the current required tap target more visually active. The prompt is doing good work, but the board/hand target itself should echo the prompt with a pulse, ring, or glow.

Consider adding a tiny label or icon above the turn tracker to distinguish "phase/round" from "tempo"; both use pips and sit near each other.

The no-plays continue button should probably be the only end-window affordance on mobile. Keeping the tracker tappable is convenient, but visually the button is the thing I trusted.

If card categories become important to tactical decisions, mini-cards may need a stronger type badge shape/color rather than only an icon plus abbreviation.

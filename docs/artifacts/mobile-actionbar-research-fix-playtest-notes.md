# Mobile Action-Bar Research Fix Playtest Notes

Date: 2026-08-13

Viewport: 390 x 844 portrait mobile layout

## Research Applied

Research summary: `docs/artifacts/mobile-ux-research-actionbar-turn-guidance.md`

Implemented from that research:

- Added labels to the mobile turn tracker so the tracker reads as phase and round status, not only symbolic pips.
- Changed empty compact action slots to say `Load`, making their purpose recognizable.
- Added a visible ready-state affordance to loaded action-bar cards: warm border treatment plus an activation glyph.
- Kept the dedicated no-plays continue button as the dominant end-window target.

## Playthrough Result

I was able to complete another turn and use an action-bar action.

The tested flow:

- Reached Round 1 Quick.
- Loaded `Guard Stance` into action slot 1.
- Charged the slot with a second card.
- Tapped the loaded action-bar slot to activate it.
- Reached the no-plays continue state.
- Advanced through boss incoming into Round 1 Slow.
- Loaded and activated a Slow action.
- Advanced into Round 2 Quick.

Evidence:

- `MOBILE_PLAYTEST_OK`
- `PLAYTHROUGH_SMOKE_OK`
- `ACTION_BAR_ART_PROBE_OK`
- `ACCESSIBILITY_PROBE_OK`
- Rendered screenshots:
  - `tmp/mobile-action-prompt.png`
  - `tmp/mobile-continue-prompt.png`
  - `tmp/mobile-ui-playtest.png`

## Playtester Notes

The biggest improvement is that the loaded action-bar card now looks tappable. The `Action ready` prompt and the `>` mark on the loaded slot reinforce each other, so I no longer have to infer that the card art panel is also a button.

The `Load` text on the empty slot helps. It turns the second slot from an abstract gray box into an obvious card receptacle.

The bottom tracker is clearer with `Quick R1/8`. It still keeps the rhythm of the pips, but now I can understand the state without decoding the icon language first.

The UI is still dense, but the action path is playable: prompt at top, target highlight in the action bar, tempo above it, phase below it.

Remaining friction: the board still competes for attention during card-loading decisions. The next useful iteration is probably context-sensitive dimming: when the player is loading/activating cards, de-emphasize inactive empty hexes and make the relevant slot/target more dominant.

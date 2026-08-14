# Accessibility Contract

This prototype follows a practical WCAG-oriented interaction baseline for its playable HUD.

## Pointer Targets

- Every visible, enabled `Button` and `CheckBox` in the player HUD has a minimum rendered target of `44x44` pixels.
- Primary command buttons use a `48` pixel minimum height to make the action grid easier to hit during play.
- Cards and action-bar slots exceed the minimum target so drag and tap interactions remain comfortable on touch screens.
- Mobile prompt text, `Play`, and Help retain separate readable/interactive lanes below the board-state header. Required prompt-adjacent controls must stay fully inside the physical portrait viewport with explicit edge padding, readable unclipped labels/icons, and preserved target sizes across the supported portrait viewport matrix. Under horizontal pressure, Help wraps to a second controls row rather than shrinking or clipping the required targets. Attention feedback changes color only and cannot enlarge either control into its neighbor.
- Hexes are validated after their responsive board scaling, not merely at their authored size.
- Controlled Hand overlap never shrinks the underlying Compact Card targets; selection raises one card and keeps adjacent cards partially visible.
- Every drag destination also has a tap path: select a Compact Card, then tap a labeled legal Slot or `MOVE` hex.
- Board navigation does not replace tactical input: the initial fitted view exposes the complete board, while optional one-finger pan and two-finger pinch support closer visual inspection. Touches beginning on units remain reserved for their existing tap and drag controls.
- Riposte Ready uses a non-interactive Status Effect pane instead of a meter. Its visible text names the status, qualifying Tank Hit, Quick expiry, Shield Slam consumption, and `+2` payoff; its tooltip adds the Guarded Front and `0` Health-loss trigger details from the authoritative snapshot.

## State and Keyboard Access

- Buttons and custom slots retain a visible high-contrast gold focus ring; focus is not suppressed with an empty style.
- Hex tiles render the same focus treatment when reached by keyboard navigation.
- Normal, hover, disabled, and focus states use light text on dark fills with distinct borders. State is communicated by more than color through borders, focus thickness, and disabled appearance.
- Compact Cards pair timing and type icons with tooltips and inspection text. Slot and board destinations use explicit `LOAD`, `REPLACE`, `CHARGE`, and `MOVE` labels in addition to color.
- Empty, Loaded, Ready, Primed, Activated, and Locked Slot states use text/icon markers and border treatment. Motion reinforces state but is not the only carrier of meaning.
- Riposte Ready is not communicated by color alone. The status pane uses text, border treatment, and a tooltip, then clears only when the authoritative status projection clears. The payoff confirmation uses the existing feedback text and is derived from action facts rather than animation or Encounter Record output.
- With `accessibility/reduced_motion` enabled, selection and Slot transitions resolve directly to the same static end state.
- Selected card titles dynamically reduce within a bounded readable range so the complete title fits rather than clipping.
- The command-state color pairs are asserted at or above `4.5:1`; the current normal, hover, disabled, and focus values measure `8.16:1`, `6.97:1`, `7.17:1`, and `7.24:1` respectively.

## Verification

Run the following from `D:\dev\webgame`:

```powershell
& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/accessibility_probe.gd

& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/board_navigation_probe.gd
```

The probe instantiates the portrait HUD, measures each enabled interactive control after layout, checks the minimum target contract, verifies that every control has a non-empty focus style, and calculates the command-state contrast ratios. The mobile HUD probe separately validates the supported portrait viewport matrix (`390x844` logical canvas and `488x1056` default presentation), explicit safe padding, and unclipped required-control labels.

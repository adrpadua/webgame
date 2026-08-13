# Accessibility Contract

This prototype follows a practical WCAG-oriented interaction baseline for its playable HUD.

## Pointer Targets

- Every visible, enabled `Button` and `CheckBox` in the player HUD has a minimum rendered target of `44x44` pixels.
- Primary command buttons use a `48` pixel minimum height to make the action grid easier to hit during play.
- Cards and action-bar slots exceed the minimum target so drag and tap interactions remain comfortable on touch screens.
- Hexes are validated after their responsive board scaling, not merely at their authored size.

## State and Keyboard Access

- Buttons and custom slots retain a visible high-contrast gold focus ring; focus is not suppressed with an empty style.
- Hex tiles render the same focus treatment when reached by keyboard navigation.
- Normal, hover, disabled, and focus states use light text on dark fills with distinct borders. State is communicated by more than color through borders, focus thickness, and disabled appearance.
- The command-state color pairs are asserted at or above `4.5:1`; the current normal, hover, disabled, and focus values measure `8.16:1`, `6.97:1`, `7.17:1`, and `7.24:1` respectively.

## Verification

Run the following from `D:\dev\webgame`:

```powershell
& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/accessibility_probe.gd
```

The probe instantiates the portrait `390x844` HUD, measures each enabled interactive control after layout, checks the minimum target contract, verifies that every control has a non-empty focus style, and calculates the command-state contrast ratios.

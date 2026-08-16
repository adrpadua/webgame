# Accessibility Contract

This prototype follows a practical WCAG-oriented interaction baseline for its playable HUD.

## Pointer Targets

- Every visible, enabled `Button` and `CheckBox` in the player HUD has a minimum rendered target of `44x44` pixels.
- Primary command buttons use a `48` pixel minimum height to make the action grid easier to hit during play.
- Cards and action-bar slots exceed the minimum target so drag and tap interactions remain comfortable on touch screens.
- Mobile prompt text, `Play`, and Help retain separate readable/interactive lanes below the board-state header. Required prompt-adjacent controls must stay fully inside the physical portrait viewport with explicit edge padding, readable unclipped labels/icons, and preserved target sizes across the supported portrait viewport matrix. The Help-hidden state visibly renders the `?` glyph plus a `Help` tooltip/name on its own tappable target; it is not satisfied by a hidden, clipped, or merely programmatically openable Control node. Under horizontal pressure, Help wraps to a second controls row rather than shrinking or clipping the required targets. Attention feedback changes color only and cannot enlarge either control into its neighbor.
- Hexes are validated after their responsive board scaling, not merely at their authored size.
- Controlled Hand overlap never shrinks the underlying Compact Card targets; selection raises one card and keeps adjacent cards partially visible.
- Every drag destination also has a tap path: select a Compact Card, then tap a labeled legal Slot or `MOVE` hex.
- First-Loadout comprehension uses explicit copy instead of color-only discovery: the prompt names the sequence, empty compact Slots read as `CARD SLOT` and `DROP`, selected cards show `SEL`, legal Slot outcomes show `LOAD`, and telegraphed enemy hexes expose `DANGER` text and tooltip copy.
- Board navigation does not replace tactical input: the initial fitted view exposes the complete board, while optional one-finger pan and two-finger pinch support closer visual inspection. Touches beginning on units remain reserved for their existing tap and drag controls.
- Riposte Ready uses a non-interactive Status Effect pane instead of a meter. Its visible text names the status, qualifying Tank Hit, Quick expiry, Shield Slam consumption, and `+2` payoff; its tooltip adds the Guarded Front and `0` Health-loss trigger details from the authoritative snapshot.
- A visible contextual tutorial card exposes its title and short guidance in text, keeps a `48`-pixel Dismiss or Close control, and supplies the same full text through its tooltip. Help provides a text-first list of shown tutorial titles and a separate reachable Review control that reopens the selected guidance as its original contextual card. Dismissal and review are presentation-only state; neither substitutes for a rule action or blocks the next gesture.

## State and Keyboard Access

- Buttons and custom slots retain a visible high-contrast gold focus ring; focus is not suppressed with an empty style.
- Hex tiles render the same focus treatment when reached by keyboard navigation.
- Normal, hover, disabled, and focus states use light text on dark fills with distinct borders. State is communicated by more than color through borders, focus thickness, and disabled appearance.
- Compact Cards pair timing and type icons with tooltips and inspection text. Slot and board destinations use explicit `LOAD`, `REPLACE`, `CHARGE`, and `MOVE` labels in addition to color.
- The selected-card state is not color-only: lift, dimming of unrelated cards, border treatment, and the `SEL` badge all persist together.
- Empty, Loaded, Ready, Primed, Activated, and Locked Slot states use text/icon markers and border treatment. Motion reinforces state but is not the only carrier of meaning.
- Enemy danger tiles are not color-only: telegraphs keep their existing tinting while also exposing `DANGER` text in the tile and `Danger: ...` in tooltip copy.
- Riposte Ready is not communicated by color alone. The status pane uses text, border treatment, and a tooltip, then clears only when the authoritative status projection clears. The payoff confirmation uses the existing feedback text and is derived from action facts rather than animation or Encounter Record output.
- With `accessibility/reduced_motion` enabled, selection and Slot transitions resolve directly to the same static end state.
- Selected card titles dynamically reduce within a bounded readable range so the complete title fits rather than clipping.
- The command-state color pairs are asserted at or above `4.5:1`; the current normal, hover, disabled, and focus values measure `8.16:1`, `6.97:1`, `7.17:1`, and `7.24:1` respectively.
- The Encounter Workbench (`web/`) carries the same contract with its own label vocabulary: destination outcomes read `Prepare`/`Charge`/`Replace` as text badges (an illegal destination shows the badge muted and struck through), the selected Compact Card pairs its lift and ring with a `Selected` badge, movement uses the labeled move-pad direction buttons, and every pulse animation declares a `motion-reduce` static end state. The Godot tokens (`LOAD`, `SEL`, `MOVE`, ...) remain the frozen HUD's vocabulary.
- Detail Popups never hide required information behind a gesture alone. Every hold target keeps its own visible name, number, and state on the HUD, carries an `aria-label` that states the same thing, and meets the `44` pixel target minimum. The popup is reachable by each input's own idiom: touch and pen press and hold, a mouse hovers, and the keyboard holds `Enter` or `Space` on the focused control, which opens the popup on the repeat event and closes it on release. A mouse press never opens one, so a click is never swallowed to protect a hold, and a quick tap stays an ordinary activation.
- Where a hovered element is smaller than the pointer minimum it must not be the only route to its detail. Boss Beat chips are the case in play: a mouse hovers one chip for that beat, while touch and keyboard reach the same content through the strip's own `44` pixel hold target, which opens all six beats at once.
- The Scripted First Turn dims and disables the controls its current step did not name, and marks the live one with a border change plus the pulsing ring rather than colour alone; the cue itself names the target control in text (`Slot 1`, `Board`, `Next`). A dimmed control never pulses, so the inert state always reads as the quieter one. A `Skip` control at the 44 pixel minimum ends the script at any point, and the step it is on is exposed as `data-step` for probes.
- The Workbench board scales itself to the room the HUD leaves rather than rendering at a fixed size. At the canonical `390x844` portrait canvas a fixed board pushed its outer ring of hexes outside the play area, so hexes a player could legally step to were off screen; the board now fits, and `web/scripts/smoke.mjs` asserts on that canvas that nothing is cropped, that every enabled control still meets `44x44`, and that the surface never scrolls sideways.
- The move pad flanks the board in the empty gutters the fitted canvas leaves, one column of three per side, with each direction on the side of the board it moves toward. As a row beneath the board it overlaid the outer hex ring — including destinations the player was being asked to step to. The columns sit flush with the play-area edges because the gutter runs only a few pixels wider than a `44` pixel button, and the smoke asserts on the portrait canvas that no pad button overlaps the board.
- Boss Beat chips stay non-interactive labels. Six chips at the 44 pixel minimum would have consumed the board area, and 21 pixel buttons would have broken the pointer contract, so the Boss Program strip is one hold surface instead: pressing anywhere on it opens the full two-track breakdown, and the strip's header button carries the same detail for keyboard reach. Hovering a single chip still explains that one beat, which costs a mouse nothing and asks nothing of a touch target.
- Board Feedback is presentation-only and never gates input: a player may act again mid-animation, and every effect resolves to the same static board. Damage numbers duplicate the authoritative Health readouts in the top bar and player panel rather than replacing them, and motion offsets, shakes, scale pops, and camera shake are all suppressed under `prefers-reduced-motion` while the numbers still appear.

## Verification

Run the following from `D:\dev\webgame`:

```powershell
& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/accessibility_probe.gd

& "C:\Users\adrpa\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe" --headless --path "D:\dev\webgame" --script res://scripts/debug/board_navigation_probe.gd
```

The probe instantiates the portrait HUD, measures each enabled interactive control after layout, checks the minimum target contract, verifies that every control has a non-empty focus style, and calculates the command-state contrast ratios. The mobile HUD probe separately validates the `390x844` logical canvas projected to the `488x1056` default presentation, explicit safe padding, unclipped required-control labels, and the rendered/discoverable Help affordance in the Help-hidden state. `tutorial_prompt_ui` verifies the projected tutorial card, full-text fallback, dismissal/history/reopen flow, and preserved portrait action-bar and hand visibility.

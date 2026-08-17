# Mobile UX Research: Action Bar and Turn Guidance

Historical artifact: a point-in-time record from 2026-08-13, taken against the Godot client that is now frozen (ADR 0019). Kept as evidence of what was observed, not as a description of the current build. The live surface is the Encounter Workbench in `web/`; the current interface direction is [oathcraft-interface-direction.md](../content/oathcraft-interface-direction.md).


Date: 2026-08-13

Scope: mobile tactical/card-game UX recommendations for the Godot prototype, based on observed playtest frictions: board visual noise, cryptic round/phase tracker pips, abstract empty action slots, weak affordance for the current tap target, and compact card type badges that require decoding.

## Source Takeaways

- Mobile game HUDs need to be adapted for touch rather than simply scaled down. Apple recommends flexible layouts, comfortable anchored controls, 17 pt+ body text where possible, 44 x 44 pt default tap targets, and direct touch controls with clear press states and visual feedback ([Apple: Design great interfaces for handheld games](https://developer.apple.com/videos/play/meet-with-apple/243/)).
- Android accessibility guidance recommends at least 48 x 48 dp touch targets, strong text contrast, and meaningful descriptions that communicate purpose and result rather than visual details ([Android Developers: Make apps more accessible](https://developer.android.com/guide/topics/ui/accessibility/apps)).
- WCAG 2.2 AA requires pointer targets to be at least 24 x 24 CSS px or have enough spacing, and explains that the goal is reducing accidental activation on touch and other pointer devices ([W3C WCAG 2.5.8 Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)).
- WCAG non-text contrast requires meaningful UI component/state indicators and important graphical objects to reach 3:1 contrast against adjacent colors; low-contrast boundaries, focus indicators, and icon details are easy to miss ([W3C WCAG 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).
- WCAG use-of-color guidance says color must not be the only way to distinguish information, indicate actions, or prompt responses; shape, text, icons, or contrast should reinforce color-coded meaning ([W3C WCAG 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)).
- NN/g's visibility-of-system-status heuristic says users need current-state feedback to understand prior interactions and determine next steps; cryptic trackers and pips should expose state and next action, not merely decorate progress ([NN/g: 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/), [NN/g: Visibility of System Status](https://www.nngroup.com/articles/visibility-system-status/)).
- NN/g's visual hierarchy guidance maps directly to the noisy board issue: color, contrast, scale, grouping, and breathing room should guide the eye to the most important elements first ([NN/g: Visual Hierarchy in UX](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)).
- NN/g's icon guidance warns that most icons are not universal; unfamiliar or compact icons need visible text labels, simple schematic design, and recognizability testing ([NN/g: Icon Usability](https://www.nngroup.com/articles/icon-usability/)).
- Game accessibility guidance specifically calls for large, well-spaced interactive elements on small/touch screens, simple controls, clear text formatting, readable default font sizes, and reinforced instructions beyond text alone ([Game Accessibility Guidelines: Full list](https://gameaccessibilityguidelines.com/full-list/)). Microsoft's Xbox Accessibility Guideline 107 also recommends avoiding required path-based or multi-point gestures when a tap alternative can provide the same function, and using up-event activation/cancelability for touch inputs ([Xbox Accessibility Guideline 107: Input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107)).

## Actionable Recommendations

1. **Quiet the board during action selection.** When the player is choosing or loading an action, dim non-interactive terrain/empty hexes and raise only actionable board elements: hero, valid destinations, targetable enemies, loaded slots, and playable hand cards. Use a restrained overlay or desaturation rather than adding more ornament. This applies NN/g visual hierarchy guidance and should reduce competition between backdrop hexes and the bottom action zone.

2. **Replace cryptic round/phase pips with a labeled status strip.** Keep the compact pip rhythm if it is valuable, but add persistent labels such as `Round 1`, `Quick`, `Boss`, and `Slow`, plus a stronger "you are here" state. The current phase marker should use at least two cues: position/scale plus color or fill, not color alone. This turns the tracker into system-status feedback instead of a symbol the player must decode.

3. **Make empty action slots look like card receptacles with intent.** Empty slots should show a card-shaped outline, a short label such as `Load card`, and a directional affordance from hand to slot when a card is selected or dragged. If slot order matters, label slots semantically, for example `Action 1` / `Action 2` or `Quick` / `Slow`; if order does not matter, avoid visual ranking that implies priority. Maintain 3:1 contrast for the empty boundary because the boundary itself communicates "this is a control."

4. **Echo the prompt on the actual target.** When the prompt says `Tap Player to move`, the hero piece should visually answer: pulse ring, glow, bounce, outline, or small handle marker. When the prompt says `Tap loaded slot`, the loaded slot should receive the same treatment. Apple specifically emphasizes touch press states and feedback because fingers obscure controls; this prototype needs a pre-tap affordance as well as post-tap confirmation.

5. **Use context-sensitive clutter reduction for controls.** Hide, fade, or visually subordinate controls that are not currently relevant. For example, during movement selection, reduce card badge emphasis and highlight destinations; during card loading, emphasize hand cards and action slots; during no-plays, make the continue affordance dominant. Apple game-touch guidance recommends removing unavailable actions to avoid screen clutter, and this maps cleanly to the prototype's phase-driven play loop.

6. **Expand card type badges from abbreviations into learned labels.** On compact cards, pair badge color/icon with a short readable label at least during onboarding or first few turns: `Damage`, `Guard`, `Skill`, etc. If space is tight, use a two-state pattern: compact badge on the card face, full label in the selected-card preview or press/hold detail. NN/g icon guidance suggests visible labels because nonstandard icons and abbreviations are not reliably self-explanatory.

7. **Keep touch targets generous even when visuals are compact.** Treat 44 x 44 px/pt as the practical prototype floor and 48 x 48 as the Android/mobile comfort target for interactive slots, pips, continue controls, card badges that open detail, and hero/hex hit regions. If a visible glyph is smaller, give it an invisible hit area and enough spacing to prevent adjacent mis-taps.

8. **Prefer tap alternatives and forgiving activation.** Drag can remain expressive for loading cards or movement, but every essential action should also work by tap/select/tap-confirm. For touch controls, avoid irreversible activation on touch-down; activate on release where feasible and allow sliding away to cancel, especially on action slots and board targets. This reduces precision pressure without changing the tactical rules.

## Prototype Acceptance Checks

- First-time player can identify the current phase and next required action within 3 seconds on a 390 x 844 portrait viewport.
- Every current required tap target has a visible pre-tap affordance on the object itself, not only in the instruction prompt.
- Empty action slots communicate whether they accept cards and whether slot order matters.
- Card type meaning is available without memorizing abbreviations.
- Interactive controls retain at least the repo's current accessibility contract: 44 x 44 minimum target, visible focus/active states, and non-text state indicators at 3:1 contrast where they are needed to identify a control or state.

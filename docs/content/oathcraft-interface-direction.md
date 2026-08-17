# Oathcraft Interface Direction

Status: locked interface contract. This document decides what the interface is made of — materials, colour, texture, and component anatomy — for card frames, controls, panels, and gauges.

Source of truth for the material language and world logic is [world-style-bible.md](world-style-bible.md); for rendering and shape language it is [hand-drawn-character-art-style.md](hand-drawn-character-art-style.md). This file applies both to the interface. If it disagrees with either, they win and this file is the bug.

Change this file only when the interface direction itself changes. Editing a colour inside a component instead of here is how an interface quietly stops being one system.

## The Governing Rule

A raid is a planned confrontation between player-side oathcraft and boss-side catastrophe. The material set splits along that same seam, and the split does most of the work.

**Oathcraft materials build the chrome.** Everything the player operates or reads is made from them.

| Material | Interface role |
| --- | --- |
| Oathsteel | Panel bodies, card frames, the structural chrome |
| Living gold | Lockwork — every control, every charge pip, armor plate edges |
| Runeglass | Projected information — art panes, telegraphs, popovers, focus |
| Aether ceramic | The ritual console — stat plates, gauges, read-outs |
| Signal cloth | Role coding, phase banners, warning trims |

**Catastrophe materials never appear in the chrome.** Ember coral is Embermaw's health, scorched ground, and hazard fills. Void basalt is later bosses, arena ground, and unstable seals.

The exception proves the rule. When ember appears inside a player panel it means the player is being hurt, and that is the entire vocabulary of damage. It stays expensive because it is rationed.

The payoff is that the interface teaches its own legend. Gold and cyan are things you operate; ember is a thing that operates on you. A player never has to be told which is which.

## Palette

The core palette is already locked in [art-prompts/_style-preamble.md](art-prompts/_style-preamble.md): clean white and deep navy masses, restrained cyan luminous seams, muted living-gold lock accents, and sparing ember-red as the single warm accent. These are those, given numbers.

| Material | Value | Carries |
| --- | --- | --- |
| Void navy | `#080D16` | The ground under everything. Navy, not black — black belongs to basalt. |
| Oathsteel | `#1B2434`, edge `#37465F` | Panel and frame bodies |
| Aether ceramic | `#E4E8EE` | Read-out surfaces and health fill |
| Runeglass | `#62D2E6` | Seams, focus, telegraphs, Quick timing |
| Living gold | `#C8A344` | Controls, charge tumblers, armor plate edges, Slow timing |
| Signal cloth | `#2F5680` | Role channel on a console, phase banners, warning trim |
| Ember | `#D9482F` | Damage taken, danger, irreversible action |
| Ember coral | `#E0703B` | Boss health, scorch, hazard fill |

Colour reads as role and material, never as decoration. If a new colour is needed, the answer is almost always that the wrong material was chosen.

## Texture, And What Is Banned

This is the constraint that settles most arguments: **the illustrations are flat cel shading with minimal gradients, so the interface must be too.** A UI built from soft shadows and frosted blur sits on top of hand-drawn card art like a different game.

Exactly three textures are permitted, and each belongs to one material:

- **Inlay seam** — a 1px cyan hairline with a small bloom, on oathsteel edges only.
- **Glyph grid** — a fine square grid at roughly 12px, inside runeglass panes only, under 15% opacity.
- **Heat vein** — thin diagonal darker striations, inside ember coral only.

There is no fourth texture, and no surface carries two.

Banned outright, with the reason each one matters:

- **Drop shadows.** Elevation is read from edge value. A 1px light top edge and a 1px dark bottom edge is the entire depth budget.
- **Frosted glass and backdrop blur.** A 3D-render idiom. Runeglass is translucent but *drawn* — a flat tint plus a faint glyph grid, with hard edges.
- **Rounded corners.** The shape language is hard geometric edges. Corners chamfer at 45°, which reads as cut plate rather than a softened rectangle.
- **Unmotivated glow.** Every glow needs a physical source. Cyan bloom is runeglass; gold bloom is a lock seating. Nothing else blooms at all.

## Card Frame

A card is a gate plate. Elian's identity is a folding Gate Rig with oathsteel ribs, living-gold lockwork, and runeglass panes, and the card frame is that object at card scale — which means the mechanics get material for free.

| Part | Material | Carries |
| --- | --- | --- |
| Lock head | Living gold, keyhole cut, top-left | Card identity; blooms when Primed |
| Frame and chamfer | Oathsteel, 45° cut corners | The plate itself |
| Inlay seam | Runeglass hairline, inset 3px | Nothing — it is the material signature |
| Timing seam | Cyan (Quick) or gold (Slow), left edge | Window speed, readable at thumbnail size |
| Art pane | Runeglass over the illustration | The card's one dominant visual idea |
| Tumblers | Gold pins in recessed slots, bottom rail | Charge Value and current Charge Stack |

A Charge Stack is tumblers seating in a lock. **Primed** — a full stack that has not activated in its matching window — is the lock wound and ready to turn, so the lock head takes a gold bloom. Nothing else on the card glows, which makes Primed unmissable in a hand of four.

The pane is why the frame stays quiet. The frame is dark, the seams are hairlines, and the illustration is the only saturated thing inside the border.

## Controls

Interfaces in this world are levers, sigils, lenses, locks, and rotating rings rather than sci-fi tablets. A button is a **lever plate**: an oathsteel rectangle with chamfered corners and a gold edge on the actuating side. Pressing it moves the plate down one pixel and swaps the top highlight for an inset shadow. It seats; it does not merely darken.

- **Gold edge** — the action advances the encounter.
- **Bare oathsteel** — the action is optional.
- **Ember edge** — something is discarded and does not come back. The only place ember appears on a control.
- **Disabled** — the edge is absent entirely. The lockwork is missing, rather than a live control wearing a grey coat.

## Panels And Gauges

Aether ceramic is smooth pale plate with embedded colour channels, used for high-status armor and ritual consoles. The Hero's panel is literally a console: a pale ceramic plate with the role colour running as a channel down its edge.

Armor is **not** a second coloured bar. Elian's armor effects look like gate plates sliding into place, so Armor renders as discrete plates with gold edges, seated on top of the health track. Health is a continuous aether-ceramic fill beneath them.

The boss track is a different object on purpose: dark oathsteel housing an ember-coral fill with heat veins. The Hero's console is a pale plate you read; the boss's is a dark housing you watch. On a 390-point-wide screen they sit at opposite ends of the frame and must never be mistaken for each other.

## Correction To The Shipped Theme

`web/src/ui/theme.ts` codes the Quick window as `emerald-400`, the Slow window as `sky-400`, and the keyboard focus ring as emerald. **Green appears nowhere in the material language or the core palette.** It arrived as a framework default rather than a decision.

Cyan and gold already mean *hard-light immediacy* and *wound mechanism*, which is exactly the distinction Quick and Slow draw.

| Token | Ships today | Direction |
| --- | --- | --- |
| `windowToneClass` · quick | `emerald-400` | Runeglass `#62D2E6` |
| `windowToneClass` · slow | `sky-400` | Living gold `#C8A344` |
| `FOCUS_RING_CLASS` | `ring-emerald-400` | Runeglass `#62D2E6` |
| `GAUGE_TRACK_CLASS` | `bg-zinc-800` | Void navy `#0F1622` |

Gold and ember sit close enough in hue to be worth guarding. Keep the filled-dot shape difference between Quick and Slow rather than relying on colour alone, and do not place a gold control directly beside an ember one — the ember edge is rare enough that this costs nothing.

This table is a direction, not a migration. No code has changed.

## What This Does Not Decide

Typography for the game itself, status-effect iconography, and motion are all open. So is the board's own rendering: telegraphs and hazards already have canon — pattern projectors in runeglass, hazards in ember coral — but applying it needs a separate pass against the Phaser scene, which draws on a different surface with different constraints than the React chrome.

## Review Checklist

Before approving a new interface element, ask:

- Can you name the material it is made from, from the table above?
- Is it built from oathcraft materials, or has a catastrophe material leaked into the chrome?
- Does every glow have a physical source?
- Does it survive flat cel shading — no shadow, no blur, no rounded corner?
- Does it carry at most one texture?
- Does it still read at 390 points wide?

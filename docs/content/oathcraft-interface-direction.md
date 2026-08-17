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
| Signal cloth | Per role; Shield Wall is `#2F5680` | Role channel on a console, phase banners, warning trim |
| Ember | `#D9482F` | Damage taken, danger, irreversible action |
| Ember coral | `#E0703B` | Boss health, scorch, hazard fill |

Colour reads as role and material, never as decoration. If a new colour is needed, the answer is almost always that the wrong material was chosen.

Two entries need their scope stated, because both look like contradictions otherwise.

**Signal cloth is a material, not a value.** The bible treats it as a saturated per-Hero role accent, so it cannot have one fixed hex. `#2F5680` is Shield Wall's, and every future role picks its own within the material. It is the one row in this table that is allowed to grow.

**Ember and ember coral are one family in two jobs.** The preamble allows a single warm accent, and this does not spend two: ember is the interface's warning, ember coral is Embermaw's own body. They never appear in the same element, and a second boss brings its own material rather than a third warm.

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

A Charge Stack is tumblers seating in a lock. **Primed** is a state of a *Slot*, not of a card: a Slot whose Charge Stack equals its Top Card's Charge Value and which has not activated in the current matching window. So the gold bloom belongs to the lock head of a Slot's Top Card, and a card in hand never wears it. That is the lock wound and ready to turn. Nothing else in the Action Bar glows, which makes a Primed Slot unmissable across two Slots and a hand of four.

The pane is why the frame stays quiet. The frame is dark, the seams are hairlines, and the illustration is the only saturated thing inside the border.

## Controls

Interfaces in this world are levers, sigils, lenses, locks, rotating rings, animated glyph plates, or projected hex diagrams rather than sci-fi tablets. A button is a **lever plate**: an oathsteel rectangle with chamfered corners and a gold edge on the actuating side. Pressing it moves the plate down one pixel and swaps the top highlight for an inset shadow. It seats; it does not merely darken.

- **Gold edge** — the action advances the encounter.
- **Bare oathsteel** — the action is optional.
- **Ember edge** — something is discarded and does not come back. The only place ember appears on a control.
- **Disabled** — the edge is absent entirely. The lockwork is missing, rather than a live control wearing a grey coat.

## Panels And Gauges

Aether ceramic is smooth pale plate with embedded colour channels, used for high-status armor and ritual consoles. The **Stat Panel** — the readout a tapped tile opens, floated over the board's lower edge — is literally a console: a pale ceramic plate with the role colour running as a channel down its edge.

Armor is **not** a second coloured bar. Elian's armor effects look like gate plates sliding into place, so Armor renders as discrete plates with gold edges, seated on top of the health track. Health is a continuous aether-ceramic fill beneath them.

A Boss Stat Panel is a different object on purpose: dark oathsteel housing an ember-coral fill with heat veins. The Hero's is a pale plate you read; the Boss's is a dark housing you watch.

That distinction carries more weight than it would have as two persistent panels. One Stat Panel is open at a time and it occupies the same place on screen whichever piece is tapped, so the difference between reading your own state and reading the thing trying to kill you is **temporal, not spatial** — the player has no side-by-side comparison to fall back on. The two must be unmistakable in the first glance after a tap, at the same coordinates, with no label read.

## Correction To The Shipped Theme

`web/src/ui/theme.ts` codes the Quick window as `emerald-400`, the Slow window as `sky-400`, and the keyboard focus ring as emerald. **Green appears nowhere in the material language or the core palette.** It arrived as a framework default rather than a decision.

Cyan and gold already mean *hard-light immediacy* and *wound mechanism*, which is exactly the distinction Quick and Slow draw.

| Token | Ships today | Direction |
| --- | --- | --- |
| `windowToneClass` · quick | `text-emerald-400` | Runeglass `#62D2E6` |
| `windowToneClass` · slow | `text-sky-400` | Living gold `#C8A344` |
| `windowDotClass` · quick | `bg-emerald-400` | Runeglass `#62D2E6` |
| `windowDotClass` · slow | `bg-sky-400` | Living gold `#C8A344` |
| `FOCUS_RING_CLASS` | `ring-emerald-400` | Runeglass `#62D2E6` |
| `GAUGE_TRACK_CLASS` | `bg-zinc-800`, `rounded-sm` | Void navy `#080D16`, chamfer |

Gold and ember sit close enough in hue to be worth guarding, and today there is nothing to fall back on: the Quick and Slow dots are the same shape, `rounded-full` at the same size, separated by colour alone. A shape difference has to be **introduced** rather than preserved — the timing seam on the card frame already does this job, so the dot should follow it rather than invent a third language. Beyond that, do not place a gold control directly beside an ember one; the ember edge is rare enough that this costs nothing.

This table is a direction, not a migration. No code has changed.

### What Adopting It Would Actually Cost

The table above is the token surface, and it is the small part. Two of this document's rules reach much further into the shipped UI, and stating them without stating the cost would be dishonest.

Counted on 2026-08-16 against `web/src/`. Treat these as a snapshot, not a contract — the interface is under active work and the numbers move week to week. Re-count before planning against them.

- **Emerald is not confined to `theme.ts`.** It appears roughly 75 times across 14 files under `web/src/ui/`, including the victory banner, the guide modal, the coach marks, and the scripted first turn's spotlight. Moving Quick to runeglass is four tokens; removing green from the interface is a sweep.
- **Rounded corners appear roughly 65 times across 17 files**, `GAUGE_TRACK_CLASS` among them. The chamfer rule is the direction, but every rounded utility is a separate edit and some sit inside components the mobile and HUD work has recently rewritten.

Neither number is an argument against the direction. They are the reason to adopt it as a deliberate pass rather than by opportunistic edits, which would leave the interface half in one language and half in the other — worse than either.

## What This Does Not Decide

Typography for the game itself, status-effect iconography, and motion are all open.

So is the board's own rendering, and it is not a blank slate. Telegraphs and hazards already have canon — pattern projectors in runeglass, hazards in ember coral — but the board also carries an inherited tint language documented in [art-prompts/board-and-tiles.md](art-prompts/board-and-tiles.md): the hover tile is green and the target tile is orange, applied as runtime `modulate` rather than baked into the art. Both sit outside this palette, and the orange target is close enough to ember to be a real collision — ember is supposed to mean *this hurts you*, and a target marker means the opposite. Reconciling that needs a pass against the Phaser scene, which draws on a different surface under different constraints than the React chrome, and which cannot simply inherit these values.

## Review Checklist

Before approving a new interface element, ask:

- Can you name the material it is made from, from the table above?
- Is it built from oathcraft materials, or has a catastrophe material leaked into the chrome?
- Does every glow have a physical source?
- Does it survive flat cel shading — no shadow, no blur, no rounded corner?
- Does it carry at most one texture?
- Does it still read at 390 points wide?

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
| Ember coral | `#E0703B` | The Boss wherever it appears: its token, health, rows, beats, emblem — and damage *dealt* to it |

Colour reads as role and material, never as decoration. If a new colour is needed, the answer is almost always that the wrong material was chosen.

Two entries need their scope stated, because both look like contradictions otherwise.

**Signal cloth is a material, not a value.** The bible treats it as a saturated per-Hero role accent, so it cannot have one fixed hex. `#2F5680` is Shield Wall's, and every future role picks its own within the material. It is the one row in this table that is allowed to grow.

**Ember and ember coral are one family in two jobs.** The preamble allows a single warm accent, and this does not spend two: ember is the interface's warning, ember coral is Embermaw's own body. They never appear in the same element, and a second boss brings its own material rather than a third warm.

Two assignments that follow from that split, settled when the last non-material warms were swept off the chrome:

- **A player's `attack` effect is ember coral, not ember.** It is damage the player *deals*, and it lands on the Boss's body — the board already flashes the Boss in coral when a strike resolves, so the card's effect tone matches what its strike does. Damage *taken* by the player is ember. Dealt and taken are the one warm family at two saturations, the same way Boss and Minion are.
- **A Status Effect on the Hero is living gold.** Riposte Ready is the Hero's own oathcraft acting — the gate catching a blow and turning — so it wears the material of every mechanism the player operates, not a warning colour.

### A Material Picks Its Step From The Ground It Sits On

A material is one column in the table and several steps in the ramp, and which step is correct is decided by what is behind it, not by the element's name. The Hero emblem is the case that keeps being read as drift: it is `cloth-500` on the Stat Panel and `cloth-300` in the How to Play guide, and both are right.

| Emblem | Ground | Ratio |
| --- | --- | --- |
| `cloth-500` | Aether ceramic (`ceramic-300`) | 6.18:1 |
| `cloth-300` | Aether ceramic | 2.15:1 |
| `cloth-300` | Void navy / oathsteel well | 7.52:1 |
| `cloth-500` | Void navy / oathsteel well | 2.62:1 |

Each shade clears 1.4.11 on its own ground and fails on the other, so unifying them would break one of the two. **The dark step goes on ceramic, the light step goes on steel.** The same reading applies to any material used on both a pale read-out and a dark well; the material stays the same, the step follows the ground.

## Texture, And What Is Banned

This is the constraint that settles most arguments: **the illustrations are flat cel shading with minimal gradients, so the interface must be too.** A UI built from soft shadows and frosted blur sits on top of hand-drawn card art like a different game.

One low-contrast gradient per surface is permitted, and only on large surfaces. Roughly a 10% value drop with no hue shift, which is what makes a plate read as a plate. Never on a chip, a pip, or a tumbler — at phone size a gradient on a small element reads as mud. An earlier revision of this document banned gradients outright; the preamble says *minimal*, not *none*, and the flat ban is what made the first pass read flat rather than solid.

Exactly four textures are permitted beyond that, and each belongs to one material or one surface:

- **Inlay seam** — a 1px cyan hairline with a small bloom, on oathsteel edges only.
- **Glyph grid** — a fine square grid at roughly 12px, inside runeglass panes only, under 15% opacity.
- **Heat vein** — thin diagonal darker striations, inside ember coral only.
- **Surface jitter** — a deterministic per-tile value shift on the board only. Value, never hue; ±6% ceiling; derived from the tile's coordinates so the same tile always lands on the same shade; never on a piece. It breaks the vector-art read of one fill repeated across a grid, and because it is deterministic the floor holds still between frames.

There is no fifth texture, and no surface carries two.

Banned outright, with the reason each one matters:

- **Blurred shadows.** Elevation is read from edge value. A 1px light top edge and a 1px dark bottom edge is the entire depth budget for chrome. A *hard-edged* cast shadow is permitted on the board, where it states the light direction — see The Board below. Chrome plates never cast.
- **Multiple gradients on one surface, and any gradient on a small element.** One per large surface is the ceiling.
- **Frosted glass and backdrop blur.** A 3D-render idiom. Runeglass is translucent but *drawn* — a flat tint plus a faint glyph grid, with hard edges.
- **Rounded corners.** The shape language is hard geometric edges. Every plate is raked instead — see Plate Geometry below, which replaces the earlier 45° chamfer rule.
- **Unmotivated glow.** Every glow needs a physical source. Cyan bloom is runeglass; gold bloom is a lock seating. Nothing else blooms at all.

## Plate Geometry

Every surface in the interface is a **plate raked at one constant angle**. This replaces the earlier 45°-chamfer rule, which produced a different lean on every element because the offset was picked by eye.

The angle is **8° from vertical, everywhere**. The horizontal offset is never chosen — it is the element's own height times `tan(8°)`, so a tall panel and a small chip lean identically instead of drifting from shallow to steep.

| Element | Height | Offset |
| --- | --- | --- |
| Program panel | 112px | 16px |
| Slot | 62px | 9px |
| Stat Panel | 56px | 8px |
| Compact Card | 48px | 7px |
| Lever | 38px | 5px |
| Phase or beat chip | 24px | 3px |
| Tumbler, armor plate | 5–16px | `skewX(-8deg)` |

Below roughly 20px, switch from `clip-path` to `skewX`. A 3px offset on a 12px-wide tumbler removes a quarter of the shape; a skew leans it without eating it. That threshold is the system's only exception, and it is a rendering constraint rather than a design one.

### Padding Has To Clear The Rake

A raked plate does not have a constant left or right margin. The left edge sits at its **rightmost at the top** and the right edge at its **leftmost at the bottom**, so uniform box padding pinches exactly two places: the top-left corner and the bottom-right one. Text lands hard against the edge there while the opposite corners look fine, which reads as a spacing bug rather than as geometry.

The rule: **horizontal padding is the rake offset plus the gap you actually want.** A 112px panel with a 16px offset and a 12px intended gap pads 28px left and right, not 12px. The extra space at the bottom-left and top-right is not waste — it is what keeps the text block optically centred inside a parallelogram.

| Element | Offset | Intended gap | Padding |
| --- | --- | --- | --- |
| Program panel | 16px | 12px | 28px |
| Lever | 5px | 18px | 23px |
| Stat Panel | 8px | 12px | 20px |
| Slot | 9px | 10px | 19px |
| Compact Card | 7px | 8px | 15px |
| Beat chip | 3px | 9px | 12px |
| Phase chip | 3px | 8px | 11px |

Vertical padding is unaffected — the rake only moves the horizontal edges.

### Accents Run Parallel To The Cut

An accent bar inside a raked clip is not a bar — the clip shaves it into a tapering wedge, which reads as a rendering fault rather than a decision. **Every leading-edge accent is skewed to the same 8°** so it stays parallel to the edge it belongs to, and it **runs that edge's full length**.

Skew it from the bottom-left origin and the bar's left face lands exactly on the plate's raked edge at every height, so it needs no inset: the notch trims its top and the clip trims the rest. An inset version was tried and rejected — pulling the accent back from both ends leaves it reading as a floating tick mark in the middle of an edge rather than as the edge itself.

With every plate carrying one, that edge becomes the status channel: gold on a Full Slot and on the control that advances the encounter, steel-grey when idle, signal cloth on the Hero's panel, ember on the Boss, and cyan or gold for a card's window speed. One reading position answers *what is this, and is it live.*

### The Top-Left Corner Is Notched, Not Ticked

A cut corner needs acknowledging or it trails off into nothing. The first attempt stuck a short perpendicular tick along the top edge; at real size that tick met the leaning accent and read as an L-shaped bracket hooked onto every plate — an addition fighting the silhouette.

**Subtract instead.** The top-left corner is notched out of the plate itself, scaled with the element: 6px on a panel, 4px on a Slot or card, 3px on a lever. The notch alone removes the corner the accent would hook around, which is why the accent can still run full length. The cut is acknowledged by the shape rather than by an ornament stuck to it.

### The Risk To Watch

With every element leaning the same way, a dense screen can start reading as *tilted* rather than as plates. Two things guard against it: the rake is shallow at 8°, and the ground stays orthogonal — the frame, the board, and the gauge fills are all square. If it begins to feel tilted at real size, un-rake the mid-size elements and keep the rake on panels and controls only.

### Provenance

The rake, the single lit primary panel, and the state bar are taken from Master Duel, which solves the same problems on the same screen size. Its surface treatment is not taken: gradient-lit panels with outer bloom are coherent against its painted card art and would out-render hand-drawn cel work, and backlit glass menus contradict a setting the bible says has no screens.

## Card Frame

A card is a gate plate. Elian's identity is a folding Gate Rig with oathsteel ribs, living-gold lockwork, and runeglass panes, and the card frame is that object at card scale — which means the mechanics get material for free.

| Part | Material | Carries |
| --- | --- | --- |
| Lock head | Living gold, keyhole cut, top-left | Card identity; blooms when the Slot is Full |
| Frame and rake | Oathsteel, raked 8°, top-left notched | The plate itself |
| Inlay seam | Runeglass hairline, inset 3px | Nothing — it is the material signature |
| Timing seam | Cyan (Quick) or gold (Slow), left edge | Window speed, readable at thumbnail size |
| Art pane | Runeglass over the illustration | The card's one dominant visual idea |
| Tumblers | Gold pins in recessed slots, bottom rail | Charge Value and current Charge Stack |

A Charge Stack is tumblers seating in a lock. **Full** is a state of a *Slot*, not of a card: a Slot whose Charge Stack equals its Top Card's Charge Value and which has not activated in the current matching window. So the gold bloom belongs to the lock head of a Slot's Top Card, and a card in hand never wears it. That is the lock wound and ready to turn. Nothing else in the Action Bar glows, which makes a Full Slot unmissable across two Slots and a hand of four.

The pane is why the frame stays quiet. The frame is dark, the seams are hairlines, and the illustration is the only saturated thing inside the border.

## Slot States, And Why Full Needs Its Own

**`Full` names the Slot, not the stack.** A Full Slot has a Charge Stack at its Top Card's Charge Value **and has not activated** in the current matching window, so it can fire and it persists. A Slot carrying the same complete stack that *did* activate is not Full: it cannot fire again, cannot take more charges, and Full-Charge Cleanup discards its Top Card and the whole stack at the end of the window. Both show every pin seated, which is exactly why the live one needs its own name and its own picture.

One of those is a resource the player is holding. The other is a card they are about to lose. Rendering both as a row of seated pins shows one picture for two opposite outcomes, and a player who cannot tell them apart cannot plan the window.

### The Signal Is Alignment, Not Brightness

Protocol magic is strongest when caster, tool, vow, and pattern **align** — the bible's own word. A lock states the same thing mechanically: when every pin clears the shear line, the plug turns. A Slot going Full is that moment, so the visual is alignment.

Three signals, each readable at a different distance:

| Signal | Reads at | Carries | Why not brightness |
| --- | --- | --- | --- |
| Ward ring closed | A glance across the whole HUD | Full or not | Closure is a shape change, so it survives peripheral vision and colour blindness; a brighter gold does not |
| Shear line | Looking at the Action Bar | Stack full, gaps gone | Segmented becoming solid is a bigger perceptual jump at 62px than any change of value |
| Gold leading edge | Looking at the Slot | This Slot is the live one | The accent is already the status channel for every plate, so Full invents no new place to look |

The **ward ring** is a ring around the lock head, broken while charging and closed at full stack, with a second faint concentric ring outside it. That outer ring is bloom drawn as a line rather than a blur, which is how it survives flat cel shading and the ban on unmotivated glow — a lock seating is the source.

The **shear line** is the Charge Stack itself. Tumblers are discrete pins with gaps between them; when the last one seats, the gaps close and they read as one continuous gold bar.

### The Ladder

| State | Ring | Tumblers | Accent |
| --- | --- | --- | --- |
| Empty | — | — | Steel |
| Loaded, 0 charge | Broken, steel | Down | Steel |
| Charging | Broken, gold | Rising, gaps open | Steel |
| **Full, window open** | **Closed, gold, outer ring** | **Shear line** | **Gold** |
| Fired this window | Reopened, one runeglass strike | Seated but dulled | Steel |
| Full, window closed | Closed in steel | Shear line, desaturated | Steel |

The runeglass strike on a spent Slot is the one place a cyan mark lands on a gold element. If it reads as an error state rather than as expenditure, drop it and let the reopened ring carry the state alone.

### Motion

The seat fires **once**, when the last pin drops, and stops. A Full Slot can persist for several rounds, and a signal that breathes for that long becomes furniture the eye edits out — which is the meter-that-means-nothing failure that got Presence deleted.

**The general rule: motion that carries state fires once; ambient motion may loop, but must never distinguish one element from another.** An earlier revision banned idle motion outright, which was too broad — a loop that applies uniformly and carries no information cannot be misread as a status signal. The board's `Board Ambience` is the sanctioned case and is bounded in `CONTEXT.md`.

A Compact Card in hand has a Charge Value but no Charge Stack and no Slot, so it can never be Full. The card frame must not imply otherwise.

## Controls

Interfaces in this world are levers, sigils, lenses, locks, rotating rings, animated glyph plates, or projected hex diagrams rather than sci-fi tablets. A button is a **lever plate**: a raked oathsteel plate with a gold accent on the leading edge. Pressing it moves the plate down one pixel and swaps the top highlight for an inset shadow. It seats; it does not merely darken.

- **Gold edge** — the action advances the encounter.
- **Bare oathsteel** — the action is optional.
- **Ember edge** — something is discarded and does not come back. The only place ember appears on a control.
- **Disabled** — the edge is absent entirely. The lockwork is missing, rather than a live control wearing a grey coat.

## Panels And Gauges

Aether ceramic is smooth pale plate with embedded colour channels, used for high-status armor and ritual consoles. The **Stat Panel** — the readout a tapped tile opens, floated over the board's lower edge — is literally a console: a pale ceramic plate with the role colour running as a channel down its edge.

Armor is **not** a second coloured bar. Elian's armor effects look like gate plates sliding into place, so Armor renders as discrete plates with gold edges, seated on top of the health track. Health is a continuous aether-ceramic fill beneath them.

A Boss Stat Panel is a different object on purpose: dark oathsteel housing an ember-coral fill with heat veins. The Hero's is a pale plate you read; the Boss's is a dark housing you watch.

That distinction carries more weight than it would have as two persistent panels. One Stat Panel is open at a time and it occupies the same place on screen whichever piece is tapped, so the difference between reading your own state and reading the thing trying to kill you is **temporal, not spatial** — the player has no side-by-side comparison to fall back on. The two must be unmistakable in the first glance after a tap, at the same coordinates, with no label read.

## Layout: The Board Is The Interface

Measured in the running Workbench at 390×844, not estimated: **the board canvas gets 318 of 844 points — 38%.** Four chrome bands stack top to bottom and the board takes what is left.

| Region | Points | Share |
| --- | --- | --- |
| Boss program strip | 102 | 12% |
| Phase strip | 61 | 7% |
| Board container | 463 | 55% |
| — hex grid actually drawn | 318 | 38% |
| Action Bar | 97 | 11% |
| Hand | 121 | 14% |

**145 points sit empty inside the board's own container**, because the hex grid is centred in a box taller than it needs. That is a fit defect rather than a layout decision, and reclaiming it is the largest single gain available at no cost to information.

The target is **roughly 80% board**, which is what comparable hex tactics on the same screen size give it.

### Bands Divide, Overlays Do Not

The structural change is not making the bands smaller. It is that **chrome floats over the board instead of displacing it.** A full-width band costs its height plus a border and forces the board into the remainder; an overlay costs only the pixels it actually covers, and can leave entirely when it has nothing to say.

Reference for the pattern: Tacticus keeps one strip at the top of the frame. With nothing selected it carries match state — rounds left, turn order, clock. Tap a unit and the same strip becomes that unit's card with its abilities beneath. Nothing is added to the layout; one slot changes what it is about, and everything else is terrain. Legal moves are painted onto the hexes rather than described in a panel — which this project already does, and should extend rather than replace.

### The Disclosure Rules

Each rule keys to something the engine already knows, so none of this needs new state — only a decision about what to draw.

| Surface | Today | Appears when | Recovers |
| --- | --- | --- | --- |
| Boss program, both rows | 102pt band, always | The strip is tapped, or a Phase Reveal fires | ~62pt |
| Resolving beat | Inside that band | Always, as one floating chip line | — |
| Phase strip, five chips | 61pt band, always | Folded into the state bar as the current phase name | ~61pt |
| Hand, four cards | 121pt band, always | Live only in a player window — Loadout, Quick, or Slow. During a Boss row it recedes in place: inert, dimmed, same height | none — see below |
| Action Bar, two Slots | 97pt band, always | Compact 44pt plates floating bottom-left; full width only while loading or charging | ~53pt |
| Stat Panel | Already on demand | A piece is tapped — no change | — |

### The Action Bar Is A Twelve-Unit Ladder

`2 | 4 | 4 | 2`. The Slots take four units each and a **rail** takes two on either side: `Undo` on the left, and on the right the single control that moves the fight forward — playing the next Boss Beat while a row is being told, closing the window otherwise, Restart once the Encounter has ended.

The rails are the point. The advance control used to sit in the phase strip at the top of the frame, which put the most-pressed thing in the interface as far from the thumb as a portrait surface allows, and put a control inside a band that is otherwise pure readout. Undo existed only in the debug rail, which is to say it did not exist for a player. Both now sit in the `Bottom Interaction Zone`, and the phase strip is a readout — one step toward the state bar this document already asks for.

Two consequences worth holding:

- **A rail is a mark, not a word.** Two units is about 57 points at 390 — room for a glyph and not a label. That is a floor on how many rails the bar can carry: a third one would have to take its units from a Slot, and a Slot's four units are already the tightest thing on the bar.
- **The Slot plate wears a tighter rake than its size class.** Four units leaves about 120 points, and `wb-plate-lg`'s symmetric clearance spent 38 of them on the cut — enough to truncate `Steady Strike`. `wb-plate-slot` clears the cut where the content actually sits, for the same reason `wb-plate-card` does. The lock head and the timing dot moved off the title row onto the row below, where each sits beside what it is about: the head with its own tumblers, the dot with the Keywords.

**A correction, made after the board took its full width.** The recovery figures in this table were computed while the board was width-bound at 302px by the MovePad's reserved gutters. Once those gutters went and the board reached the full 390px, it became width-bound at the viewport itself: no amount of vertical space can make it larger on this phone. So hiding the Hand recovers **nothing for the board**, and shrinking the band would also break the contract that the board never resizes mid-Encounter. What the Hand rule still buys is hierarchy — during a Boss row the Hand recedes in place and the board becomes the loudest thing on screen — and that is the part worth having.

**The Hand rule is the one to defend, because it is rules-derived rather than borrowed.** Boss Rows resolve in the Instant and Incoming phases, and a player cannot play a card in either — the window model and the Slot Activation Limit already say so. A Hand at full height through a phase where every card is illegal is the interface asserting something the rules deny.

### Where The Comparison Breaks

**Tacticus has no hand.** Its units carry abilities as icons that appear on selection, so its bottom chrome is two floating buttons. A card game has to show four cards well enough to choose between them, and a card is a wider, denser object than an ability icon. The Hand's ~104pt is a real floor: the win is that it is absent for the phases where it is inert, not that it gets smaller.

**Unit state on the token cuts the other way.** Tacticus puts health bars and status pips on every unit. This project moved the opposite direction, taking the mini bars off tiles so the Stat Panel is the only readout. With two or three pieces on the board that is defensible; a game managing ten needs state on the token. Board-first argues for putting it back, the Stat Panel decision argues against, and the tension should be resolved deliberately rather than drifted through.

### Sequence

1. **Reclaim the 145pt of container slack.** No disclosure decision, no information removed, largest single gain.
2. **Fold the phase strip into the state bar.** One band disappears and nothing is hidden — the current phase is named instead of all five being listed.
3. **Float the chrome rather than banding it**, and collapse the boss program to its resolving beat with the full breakdown on tap.
4. **Make the Hand phase-aware.** The only step that removes something a player can currently see, so the one to playtest rather than assume.

The smoke suite already asserts that the whole board is on screen at 390×844, that every enabled control meets 44 points, and that the surface never scrolls sideways — which is what makes these safe to attempt. Step four needs a new assertion of its own: a Hand that hides has to be provably reachable.

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
| `GAUGE_TRACK_CLASS` | `bg-zinc-800`, `rounded-sm` | Void navy `#080D16`, raked |

Gold and ember sit close enough in hue to be worth guarding, and today there is nothing to fall back on: the Quick and Slow dots are the same shape, `rounded-full` at the same size, separated by colour alone. A shape difference has to be **introduced** rather than preserved — the timing seam on the card frame already does this job, so the dot should follow it rather than invent a third language. Beyond that, do not place a gold control directly beside an ember one; the ember edge is rare enough that this costs nothing.

This table is a direction, not a migration. No code has changed.

### What Adopting It Would Actually Cost

The table above is the token surface, and it is the small part. Two of this document's rules reach much further into the shipped UI, and stating them without stating the cost would be dishonest.

Counted on 2026-08-16 against `web/src/`. Treat these as a snapshot, not a contract — the interface is under active work and the numbers move week to week. Re-count before planning against them.

- **Emerald is not confined to `theme.ts`.** It appears roughly 75 times across 14 files under `web/src/ui/`, including the victory banner, the guide modal, the coach marks, and the scripted first turn's spotlight. Moving Quick to runeglass is four tokens; removing green from the interface is a sweep.
- **Rounded corners appear roughly 65 times across 17 files**, `GAUGE_TRACK_CLASS` among them. The rake replaces those corners rather than merely un-rounding them, so it is the same edit either way — but every rounded utility is a separate one, and some sit inside components the mobile and HUD work has recently rewritten. Doing it panel by panel would leave the interface half raked and half rounded, which reads worse than either.

Neither number is an argument against the direction. They are the reason to adopt it as a deliberate pass rather than by opportunistic edits, which would leave the interface half in one language and half in the other — worse than either.

## The Board

Settled August 2026, after the board landed its own direction from [dead-cells-art-style-research.md](../artifacts/dead-cells-art-style-research.md) — a document that states it "is not an art-direction decision and it does not create canon" and was written without knowledge of this file.

**Ownership splits by concern, not by surface.** This document owns the material language, the palette, motion policy, and the texture bans, and they bind the board as well as the chrome. [oathcraft-board-direction.md](oathcraft-board-direction.md) owns board implementation — tint application, lighting angles, sprite pipeline, pixel scale, hex-versus-pixel-grid geometry. A surface split would put the palette in two places, which is the failure that produced this reconciliation.

### Colour Resolves In Two Steps

**Objects take their material. Hex tints take their temperature.**

An object is anything that *is* something — a piece, the ground, a structure. A tint painted over a hex is information about that hex, not an object made of runeglass, so it takes its side from what it means: **warm is their beat, cool is your move.** That line is where the fiction already draws it. A pattern projector is a real oathcraft device; the light it paints on the floor is a message about the floor.

| Role | Kind | Takes |
| --- | --- | --- |
| Hero token | Object | Signal cloth, per role |
| Boss token | Object | Ember coral |
| Minion token | Object | Ember coral, lower saturation and smaller |
| Scorched ground | Object | Ember coral — a substance lying there, not a projection |
| Telegraph | Tint | Warm — their beat |
| Legal destination | Tint | Cool — your move |
| Target marker | Tint | Cool — a player affordance |
| Board Feedback flash | Event | Axis for the side, material for the value |

Boss and Minion share a material because `world-style-bible.md` says a Whelp is *"splintered furnace sparks"* — a piece of the furnace. Giving it its own hue asserts a separation the fiction denies and makes a Brood Call spawn read as a different faction arriving rather than the Boss shedding part of itself. **Green is not a material and does not appear**; healing is aether ceramic, which the world already assigns to medical technology.

### Saturation Ranks By Imminence

Within each temperature, the more imminent thing is the more saturated. The research's rule is that colour is a targeting aid and *"anything new or dangerous gets a hue and saturation nothing else on screen is using"* — but *newest* and *most dangerous* conflict routinely, and imminence subsumes both.

- **Warm**, most to least: the beat resolving now, a telegraphed beat landing next window, the Boss, a Minion, scorched ground.
- **Cool**, most to least: legal destinations while choosing, the Hero, the ground.

Imminence rather than novelty, or a spawned Minion outshouts the cone about to land on you. Imminence rather than damage, or scorched ground never fades after it has been paid for.

### Lighting Was Never The Disagreement

The board's piece shading is two flat fills against one light — a shadow tone across the whole circle, then the lit tone offset toward the key. That is a hard two-tone step, not a gradient ramp, and it is exactly the cel model this document requires. The research arrives independently at the same place: Dead Cells' entire toon model is one threshold and two values, and its recommended route bakes light into the sprite rather than shipping normal maps.

Two consequences:

- **A hard-edged cast shadow is permitted on the board.** It states the light direction, which is information, and the research treats the existing one as the convention that establishes it. Canon already assumes a lighting environment — void basalt *"eats rim light"*. Chrome plates still never cast.
- **Keep the key-side highlight and add a lower-right rim.** They do different jobs: the highlight says where the light is, the rim separates a dark piece from a dark tile. A faint full ring separates equally in every direction, which flattens the light it sits inside.

### State Stays In The Stat Panel

The board keeps tiles clean until tapped. Board-first layout argues for health on the token, but health bars on every token are chrome that never recedes, and with two or three pieces the tap cost is low. **Revisit when the multi-Hero party model lands** — Engineering rank 6 — and four friendly pieces have health that matters at once.

## What This Does Not Decide

Typography for the game itself, status-effect iconography, and motion beyond the Full seat are all open. The Layout section above decides how much of the frame the board gets and what may float over it, but not what the board itself draws.

So is the board's own rendering, and it is not a blank slate. Telegraphs and hazards already have canon — pattern projectors in runeglass, hazards in ember coral — but the board also carries an inherited tint language documented in [art-prompts/board-and-tiles.md](art-prompts/board-and-tiles.md): the hover tile is green and the target tile is orange, applied as runtime `modulate` rather than baked into the art. Both sit outside this palette, and the orange target is close enough to ember to be a real collision — ember is supposed to mean *this hurts you*, and a target marker means the opposite. Reconciling that needs a pass against the Phaser scene, which draws on a different surface under different constraints than the React chrome, and which cannot simply inherit these values.

## Review Checklist

Before approving a new interface element, ask:

- Can you name the material it is made from, from the table above?
- Is it built from oathcraft materials, or has a catastrophe material leaked into the chrome?
- Does every glow have a physical source?
- Does it survive flat cel shading — no shadow, no blur, no rounded corner?
- Is it raked at 8°, with its offset derived from its height rather than chosen?
- Does its horizontal padding clear the offset, so the top-left and bottom-right corners do not pinch?
- Does its accent run parallel to the cut, along that edge's full length?
- Does it carry at most one texture and at most one gradient?
- If it shows a Slot, can a player tell a Full Slot from one that already fired on the same complete stack?
- Does it float over the board rather than adding a band that displaces it?
- If it is on the board: is it an object taking a material, or a tint taking a temperature?
- If it moves continuously, does it apply uniformly and carry no state?
- If it is persistent, is it useful in every phase — or should it recede in the ones where it is inert?
- Does it still read at 390 points wide?

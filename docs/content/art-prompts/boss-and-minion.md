# Boss And Minion Art

Status: active prompt template. Produces raid boss and minion art — the entities on the far side of the encounter.

Compose as: [`_style-preamble.md`](_style-preamble.md) block, then the block below.

Output goes to `assets/art/bosses/<boss-slug>/` and `assets/art/minions/`.

## Design Rule

A boss is not a large monster. It is a catastrophic system with behavior — a living furnace, an ancient instrument, a corrupted oath-engine, a divine body without restraint — that can be studied, baited, resisted, and answered. The art has to promise counterplay. If it reads as an unpredictable beast rather than a mechanism with rules, it is wrong regardless of how good it looks.

Per [world-style-bible.md](../world-style-bible.md), each boss needs a readable silhouette and material signature, two or three named mechanic families, visible telegraph language, at least one role-specific pressure, and one phase escalation.

## Boss Prompt Block

```text
Create a full-body concept illustration of a raid boss.

BOSS: {{BOSS_NAME}}, {{ONE_LINE_HOOK}}.

MATERIAL SIGNATURE: {{MATERIALS}}.

MECHANISM — the part of this creature that visibly explains how it fights, and which must be the strongest read in the image: {{MECHANISM}}.

TELEGRAPH LANGUAGE — how it announces an attack before it lands: {{TELEGRAPH}}.

SCALE CUE: {{SCALE}}.

COMPOSITION:
One full-body figure, three-quarter view, light neutral background, generous negative space. Grounded and weighty. The mechanism should be legible enough that a viewer could guess how the fight works before being told.

This is a designed catastrophe with visible operating principles, not a wild animal. Show the machinery of the threat.
```

## Minion Prompt Block

```text
Create a full-body concept illustration of a minor raid-encounter creature that fights alongside a much larger boss.

MINION: {{MINION_NAME}}, {{ONE_LINE_HOOK}}.

MATERIAL SIGNATURE, which must clearly derive from its parent boss: {{MATERIALS}}.

COMPOSITION:
One full-body figure, three-quarter view, light neutral background. Small and fast in proportion — this must never be mistaken for the boss at a glance, so keep the silhouette compact and the mass low.

Readability at small board size is the priority. Very few shapes, strong value separation, one clear identifying feature.
```

## Current Encounter Entities

**Embermaw** — the authored raid boss, live in `resources/boss/programs/`.

| Slot | Value |
| --- | --- |
| `BOSS_NAME` | `Embermaw` |
| `ONE_LINE_HOOK` | `a living furnace that treats an arena as a kiln to be heated evenly` |
| `MATERIALS` | `ember coral with visible heat veins, blackened fragmentary oathsteel plating hanging off it like shed containment, and exposed furnace-like organs glowing deep in its body` |
| `MECHANISM` | `the furnace throat and the intake and exhaust structures feeding it, so a viewer understands that its attacks are controlled heat pressure released on a cycle rather than random flame` |
| `TELEGRAPH` | `heat blooming visibly along the coral veins and the throat drawing open before a release` |
| `SCALE` | `large enough to dominate several hexes, but built low and wide rather than tall` |

Its authored mechanic families are Cinder Breath, Scorched terrain, Molting Roar, Ashen Brand, Molten Tail, and Cinderstorm — heat pressure, lane denial, and clutching claws. The art should make lane denial and arena-shaping heat geometry feel inevitable.

**Whelp** — the minion in `resources/minions/whelp.tres`.

| Slot | Value |
| --- | --- |
| `MINION_NAME` | `Whelp` |
| `ONE_LINE_HOOK` | `a splintered furnace spark that broke off the Embermaw and kept burning` |
| `MATERIALS` | `small shards of ember coral around a too-bright core, with a few flecks of blackened oathsteel caught in the growth` |

Explicitly not a baby dragon. It is a fragment of the boss's furnace that achieved motion, and it should look like debris that is still dangerously hot.

## Acceptance Check

- Could a player guess one of this boss's mechanics from the art alone?
- Is the mechanism the strongest read, ahead of the silhouette's aggression?
- Does the material signature connect boss and minion without making the minion a scaled-down copy?
- At board size, is the minion instantly distinguishable from the boss?
- Does the telegraph language suggest something a player could react to?
- Any text, logo, or watermark? Reject.

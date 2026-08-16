# Hero Concept Art

Status: active prompt template. Produces full-body Hero concept sheets — the reference art every other asset for that Hero is generated against.

Compose as: [`_style-preamble.md`](_style-preamble.md) block, then the block below.

Output goes to `assets/art/concepts/<hero-slug>/`.

## Proven Reference

[`assets/art/concepts/elian-voss/elian-voss-clean-concept.png`](../../../assets/art/concepts/elian-voss/elian-voss-clean-concept.png) was produced from this recipe and is the calibration target for the whole library. It landed the keyhole lock motif at the collar, cyan runeglass seams over white and deep-navy plate, the ember-red cord on the baton, and the three deployed Gate Rig panels.

Attach it as a style reference when generating any new Hero, so the second Hero reads as the same game rather than the same description.

## Prompt Block

```text
Create a single full-body character concept sheet for one Hero.

HERO: {{HERO_NAME}}, {{PRONOUNS}}, the {{ROLE_TITLE}} of {{HOME_PLACE}}.

COMBAT VOW — the promise the whole design must express: {{VOW}}.

IDENTITY DEVICE — the one prop or system that sells this Hero, and the only major system allowed to compete for attention: {{IDENTITY_DEVICE}}.

MATERIAL SET, drawn from the material language above: {{MATERIALS}}.

ROLE COLOR ACCENT: {{ROLE_COLOR}}.

SILHOUETTE: {{SILHOUETTE_NOTES}}.

COMPOSITION:
One full-body figure in a calm 3/4 front pose, standing, weight settled, not mid-action. Light neutral or soft white background. Generous negative space around the figure so the silhouette reads cleanly. Optionally one small callout of the identity device floating beside the figure at a larger scale, drawn in the same style, with no text or labels of any kind.

The figure should look like a working professional who operates dangerous equipment, not a posed hero portrait. Confident and calm, not aggressive.
```

## Slots

| Slot | What to put in it | Elian Voss example |
| --- | --- | --- |
| `HERO_NAME` | Full in-world name | `Captain Elian Voss` |
| `PRONOUNS` | The Hero's pronouns | `who uses they/them pronouns` |
| `ROLE_TITLE` | Role fantasy, not a class name | `Shield Wall tank` |
| `HOME_PLACE` | A place from the gazetteer | `Redwater Locks, a mythic canal-fortress city of gate engines and flood control` |
| `VOW` | One sentence, the kit's justification | `hold the line so that others can move` |
| `IDENTITY_DEVICE` | One system, described physically | `a compact forearm-and-back Gate Rig that deploys two or three large translucent rectangular runeglass gate panels, plus a short gateblade baton carried like a ceremonial key` |
| `MATERIALS` | Two to four from the preamble | `oathsteel frame, living-gold locks and hinges, weathered blue signal cloth, runeglass barrier panes, and one small ember-red cord` |
| `ROLE_COLOR` | One accent color | `restrained cyan` |
| `SILHOUETTE_NOTES` | Mass distribution | `stable and grounded, with a slightly broader shoulder and back mass than a damage Hero, a compact waist, readable legs, and Gate Rig asymmetry on one side` |

## Role Silhouette Guidance

Fill `SILHOUETTE_NOTES` so roles stay distinguishable in shadow:

- **Tank** — broad shoulder and back mass, grounded stance, low center of gravity, asymmetric defensive rig.
- **Healer** — vertical emphasis, cleaner and lighter plate, hands and forearms clearly visible and unobstructed, one hanging signal-cloth panel.
- **Damage** — narrow and forward-leaning, the weapon or focus as the longest line in the silhouette, minimal cloth.
- **Support/Control** — mid-weight, with the identity device held away from the body so the projected geometry has room to read.

## Acceptance Check

Reject and re-run if any of these fail:

- The silhouette does not survive being shrunk to phone size.
- More than one or two major visual systems compete for attention.
- The role is not guessable from posture and prop alone.
- Any glow lacks a material source from the preamble.
- The render reads as 3D, photoreal, or bloom-heavy rather than hand-drawn.
- Armor has dissolved into many small plates instead of large grouped masses.
- Any text, logo, or watermark appears.

## Do Not

Do not give a Hero a giant ornate handheld shield, a generic staff, or a plain sword as their identity device. A Tank is a branded defensive system, not a person in armor; a Healer is a recovery protocol with a point of view, not a person with a staff. If the device could belong to any fantasy game, it is wrong for this one.

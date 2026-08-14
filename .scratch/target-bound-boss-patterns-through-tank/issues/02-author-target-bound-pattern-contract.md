# Author Target-Bound Pattern Contract

Status: resolved
Owner: Game Design
Blocked by: 01

## Outcome

Record target-bound directional Boss pattern vocabulary, Party-play intent, target inclusion/through-target continuation meaning, and one future encounter example. Preserve the distinction from Targeted Boss Hit attrition and Avoidable Board Pattern geometry.

## Resolution

Canonical documentation now defines `Target-Bound Pattern` as a Boss Beat composition of `Target Selector` plus directional `Target Pattern`, with Facing derived from Boss source hex to the selected Piece and snapped to one of `E`, `NE`, `NW`, `W`, `SW`, or `SE`.

The contract preserves these boundaries:

- the selected Piece and affected Pieces are tracked separately;
- an authored Tank cleave may include the selected Tank hex and continue beyond that Tank to affect non-Tank Heroes;
- off-board cells clip like other Target Patterns;
- same-hex or non-directional target cases are invalid unless the Beat authors an explicit fallback;
- this is future-party capability only, with no Embermaw resource edit, `Raking Claw`/`Cinder Breath` redefinition, player-card targeting UI, arbitrary-angle aiming, persistent player-facing burden, or general pattern migration.

Future human-readable example recorded as `Furnace Cleave` in the Embermaw Ashen Trial design document. Architecture remains next owner for any candidate resolver surface and probes.

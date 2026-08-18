# Target Bursts at hexes and hit every Enemy

A Card with `burst_radius >= 1` selects an on-board hex within the Card's Range, measured from the firing Hero to that hex. The selected hex is a center, not a Piece: it may be empty, and the legal target does not change when combatants enter or leave the footprint. The Workbench previews the same engine-resolved on-board footprint that resolution records.

Every Enemy occupying a hex within the Burst radius takes the Card's target damage. Enemy retains its domain meaning, so the Boss and all Minions are included; Heroes and other allies are not. Resolution orders affected Minions by stable entity id, then resolves the Boss last, and generates one ordinary `damage` action per Enemy. Boss-last ordering ensures a lethal Boss hit cannot end the Encounter before sibling Minion hits land. The resulting per-Enemy Resolution Facts preserve prevention, status bonuses, defeat, replay, and existing hit feedback instead of inventing a combined area-damage result.

A Burst Card that also declares direct `boss_damage` still resolves every affected non-Boss Enemy first. The Boss then receives one ordinary damage action combining its Burst damage, direct Boss damage, and any one-shot Boss-damage Status bonus. A Burst whose footprint includes the Boss therefore counts as a Card that deals Boss damage for triggers such as Riposte Ready; the bonus changes only the Boss's damage, never the damage dealt to sibling Minions.

The firing `fire_slot` Resolution Fact records the selected center and the stable ordered on-board footprint. Presentation derives the Hero's Blast from that fact and derives each hit from its ordinary damage fact. This keeps geometry in the engine and presentation on the fact boundary (ADR 0019).

`burst_radius: 0` is the default and keeps the existing single-Piece damage path unchanged. A positive Burst radius requires positive `damage` and `target_type: "hex"`; the Content Catalog rejects invalid combinations and names the authored file. Existing `target_damage` Charge Modifiers increase the damage dealt to every affected Enemy, but no Charge Modifier changes the radius.

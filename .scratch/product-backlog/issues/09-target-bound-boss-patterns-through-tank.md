# Add Target-Bound Boss Patterns Through the Tank for Future Raid Mechanics

Status: ready-for-agent

## Player Problem

In full `3`-`4` Hero raids, tanks usually control boss facing by holding the dangerous space and turning the boss away from the rest of the Party. The current rules vocabulary cleanly separates Targeted Boss Hits from Avoidable Board Patterns, but it does not yet give future encounters a reusable way to say:

- select the Tank as the target;
- derive a directional pattern from Boss to that target; and
- continue the danger through or behind that Tank into the raid-facing space.

Without that capability, future multiplayer bosses risk flattening MMO-style positioning into either pure single-target attrition or pure floor geometry. That would weaken the Tank's spatial responsibility and make "stand behind the Tank" or "do not stack in the cleave line" harder to express clearly and consistently.

## Desired Outcome

Add a reusable backlog capability for target-bound boss patterns that support MMO tank-facing behavior in future `3`-`4` Hero raids.

The player-facing promise is: some Boss mechanics can deliberately target the Tank and project a directional pattern from the Boss through that Tank, so the Tank manages boss direction and placement while non-tanks avoid standing in the projected danger behind the Tank.

This preserves three distinct raid jobs:

- Targeted Boss Hit attrition remains direct Tank pressure.
- Avoidable Board Patterns remain movement-readable geometry.
- Target-bound boss patterns become the bridge case where a selected target and projected geometry both matter.

## Scope

- Define a reusable rule/category for target-bound boss patterns, such as `TargetBoundPattern` or an equivalent canonical name.
- Define the authored relationship between:
  - a `Target Selector`;
  - a `Target Pattern`; and
  - an orientation-derivation rule from source piece to selected target piece.
- Require directional orientation to derive from `source -> selected target`, snapped to one of the six legal hex-edge Facings: `E`, `NE`, `NW`, `W`, `SW`, `SE`.
- Require the selected target's hex to be included in the resolved pattern when the authored mechanic says it projects "through" that target.
- Allow the pattern to continue beyond or behind the selected target into raid-side hexes when authored to do so.
- Keep the first accepted reusable pattern family bounded to a Boss cleave or cone through the Tank.
- Require at least one future human-readable encounter example that demonstrates the intended raid-facing use without changing live default content.

## Explicit Non-Goals

- No immediate live Embermaw encounter edit.
- No redefinition of the current Embermaw split where `Raking Claw` is a Targeted Boss Tank Hit and `Cinder Breath` is avoidable geometry, unless separately approved.
- No player-facing target-selection UI for player cards.
- No generic arbitrary-angle targeting; orientation must snap to one of the six legal hex Facings.
- No new persistent player-facing facing burden unless separately approved.
- No weakening of the distinction between Targeted Boss Hit attrition and avoidable projected geometry.
- No requirement that every future cone or cleave use this model; this is an additional reusable capability, not a forced replacement for existing pattern types.

## Acceptance Evidence

Before this intake can close as delivered, evidence must show that:

1. Design records canonical wording for target-bound directional boss patterns, including their player-facing intent in Party play.
2. The rules contract preserves the distinction between:
   - pure Targeted Boss Hit attrition;
   - pure Avoidable Board Pattern geometry; and
   - target-bound projected patterns that combine a selected target with projected hex danger.
3. Architecture defines an authoritative resolution contract from source piece to selected target piece, including facing derivation, legal six-edge snap behavior, target inclusion, continuation beyond the target where authored, and off-board clipping.
4. A deterministic semantic probe proves that a Tank-targeted cone or cleave:
   - includes the Tank hex;
   - continues beyond the Tank in the derived direction when authored to do so;
   - clips off-board correctly;
   - uses only legal Facings; and
   - distinguishes the selected Tank from other affected non-tanks occupying the projected hexes.
5. At least one future human-readable encounter example demonstrates how the capability supports MMO-style tank-facing behavior without requiring live default encounter edits.

## Affected Areas

| Area | Product impact |
| --- | --- |
| Game Design | Owns the raid-facing intent, canonical vocabulary, encounter-authoring examples, and the distinction from existing targeted-hit and avoidable-pattern language. |
| Architecture | Owns the authoritative source-to-target pattern derivation contract and preserves `EncounterEngine` / `BoardQuery` as the geometry authority. |
| UI/UX | Is a later consumer only for boss telegraphs and Party readability; this intake does not approve new targeting UI. |
| Test Automation | Owns deterministic semantic coverage for source-to-target derivation, legal Facing snap, clipping, and target-versus-affected distinction. |
| Product Management | Keeps this capability separate from live encounter tuning, player-card targeting UI, and any broader player-facing facing-system expansion. |

## Canonical Documents To Consult Or Update

- [CONTEXT.md](../../../CONTEXT.md): authoritative terms for `Targeted Boss Hit`, `Avoidable Board Pattern`, `Target Selector`, `Target Pattern`, `Pattern Selection Binding`, Party roles, and legal Facings.
- [Prototype rules](../../../docs/rules/prototype-rules.md): reusable target-pattern catalog and current legal directional model.
- [Headless Rules SDK](../../../docs/rules/headless-rules-sdk.md): `EncounterEngine` / `BoardQuery` authority seam.
- [Embermaw prototype encounter](../../../docs/content/encounters/embermaw-prototype.md): preserve the current Targeted Boss Hit versus avoidable-pattern split.
- [Probe harness](../../../docs/artifacts/probe-harness.md): deterministic semantic probe expectations.
- [Project coordination ledger](../../../docs/artifacts/project-coordination.md): preserves separation from the closed targeted-hit conformance slice and future delivery routing.

## Open Product Decisions

- Should the first approved deliverable be:
  - documentation-only catalog and design wording; or
  - documentation plus authoritative resolver/probe support behind no live encounter content?

PM recommendation: documentation plus resolver/probe support, with no live encounter content change, because the value is foundational only if future Party bosses can rely on an authoritative contract rather than a purely narrative design note.

## Risks And Dependencies

- If this capability is not kept distinct from pure Targeted Boss Hits, the Tank attrition model could become muddled again.
- If it is not kept distinct from Avoidable Board Patterns, the game could accidentally turn every projected cone into a dodge-only mechanic and weaken tank-facing responsibility.
- Deriving a legal six-edge Facing from source to selected target must stay authoritative and deterministic, especially for adjacent, near-edge, or non-collinear cases.
- The feature's value depends on future multi-Hero encounter design; it should not be justified by retrofitting the current Embermaw slice without separate approval.

## Approval Record

On Friday, August 14, 2026, Game Design routed a user-requested PM intake for future target-bound boss cone patterns that support MMO-style tank-facing behavior in `3`-`4` Hero raids. Later on Friday, August 14, 2026, the user explicitly approved moving proposal 09 to delivery intake. This item is now `ready-for-agent`.

The Orchestrator must preserve the confirmed future raid-facing outcome, non-goals, acceptance evidence, and separation from current Embermaw content; create separate delivery tracking outside the PM backlog; and return any live encounter retuning, player-targeting UI expansion, or broader facing-system change to PM and the user.

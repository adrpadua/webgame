# Controlled Elian Test-Deck Evaluation Cohort

Status: resolved

## Player Problem

The delivered Combat Postures first slice proved that Riposte Ready works mechanically and visually, but the unchanged live two-card baseline deck cannot evaluate whether Elian's full Shield Wall machine is actually fun and readable. That cohort contains zero `Shield Slam`, `Sweeping Blow`, or `Fortify`, so it can demonstrate only the defensive Riposte trigger; payoff, add-clearing, Slow commitment, and the "no dominant Shield Slam line" question remain untestable.

Without a bounded evaluation-only deck candidate, the project cannot accurately judge whether Elian's intended expanded machine creates meaningful Slot Tension before any default-deck or tuning decision.

## Desired Outcome

Authorize one new fixed-seed evaluation cohort that uses the already documented controlled 20-card Elian Voss test deck:

- `8x Steady Strike`
- `6x Iron Guard`
- `2x Sweeping Blow`
- `2x Fortify`
- `2x Shield Slam`

This cohort exists only to evaluate the expanded Shield Wall machine. It must let Design observe Riposte into Shield Slam payoff, add clearing, and Slow commitment on one unchanged fingerprint without implying live/default promotion.

The smallest approved interpretation is an evaluation-only controlled candidate configuration. It is not approval to replace the default starter deck now.

## Scope

- Create the smallest delivery shape that can run one evaluation-only controlled test-deck cohort with the documented 20-card list.
- Run one new fixed-seed Evidence Cohort on one unchanged fingerprint using the established deck-evaluation report flow.
- Preserve the focused Whelp-clear and Fortify/Slow contract context as supporting evidence for the expanded machine.
- Produce one Design review note tied to the new cohort and its report artifacts.
- Return a recommendation about whether the controlled deck improves Shield Wall identity and meaningful Slot decisions.

This is a bounded evaluation authorization, not a default-deck decision. Delivery may choose the smallest reversible expression, such as a dedicated evaluation-only deck resource or another temporary candidate configuration, as long as it is clearly non-default and does not broaden the product outcome.

## Explicit Non-Goals

- Replacing the live/default Elian Voss starter deck.
- Balance tuning, card-value changes, or encounter retuning from the first pass.
- Changing the live baseline result that closed Combat Postures issue 05.
- Broad seed sweeps, hand guarantees, forced draw order, or teaching-pacing edits beyond the named fixed-seed cohort.
- Hidden promotion of `Shield Slam`, `Sweeping Blow`, or `Fortify` into the default deck.
- General deck-building, progression, analytics, or UI-authoring work outside the existing evaluation/report flow.

## Acceptance Evidence

Before this intake can close as delivered, focused evidence must show that:

1. The controlled deck cohort uses exactly one unchanged fingerprint and the documented 20-card list.
2. The cohort runs the fixed-seed evaluation flow through the canonical Encounter Record/report path and produces linked evidence for each run.
3. Design records one human review note that scores Viability and Play-feel, cites at least one Riposte-to-Shield-Slam payoff moment when present, and explicitly addresses meaningful Slot decisions and any dominant Shield Slam pattern.
4. The evidence packet preserves Whelp-clear and Fortify/Slow contract context rather than claiming those branches from unsupported data.
5. The result ends as an evaluation recommendation only; it does not promote the default deck or imply balance/content changes by itself.
6. If the controlled deck still cannot answer the intended questions, the note explains what remained untestable without inferring a live/default change.

## Affected Areas

| Area | Product impact |
| --- | --- |
| Design | Reviews the new controlled cohort, writes the human note, and recommends whether the expanded machine is promising enough for a later default-deck discussion. |
| Architecture | Provides the smallest reversible evaluation-only deck/resource expression if delivery needs one and preserves the existing record/report flow. |
| Test Automation | Verifies the new cohort's deterministic evidence, fingerprint integrity, and report linkage. |
| UI/UX | Re-enters only if the expanded cohort reveals a genuine presentation or readability problem. |
| Engineering Enablement | Reuses the existing Evidence Cohort/report path only if a small bounded adjustment is required for the controlled deck packet. |

## Canonical Documents To Consult Or Update

- [Elian Voss design](../../../docs/content/heroes/elian-voss-design.md): controlled 20-card test list, role intent, and required evidence.
- [Character Design Bible](../../../docs/rules/character-design-bible.md): Shield Wall machine, starter-deck caution, and Slot Tension expectations.
- [Deck Evaluation Rubric](../../../docs/content/deck-evaluation-rubric.md): viability, play-feel, Slot Tension, role moment, and promotion gate.
- [Deck Evaluation Measurement Plan](../../../docs/artifacts/deck-evaluation-measurement-plan.md): fixed-seed cohort/report flow.
- [First Content Pass](../../../docs/content/first-content-pass.md): smallest valid test list after the live two-card gate.
- [Combat Postures delivery spec](../../combat-postures-aegis-guardian/spec.md): delivered first-slice context and the closed baseline-cohort limitation.
- [Project coordination ledger](../../../docs/artifacts/project-coordination.md): cross-role ownership, active work, and closure state.

## Confirmed Product Decisions

- The smallest approved scope is evaluation-only: authorize the documented controlled 20-card deck for one new fixed-seed cohort.
- This intake does not replace the default starter deck.
- The first pass must not infer balance tuning or promotion from one controlled cohort alone.
- The cohort must use the established Evidence Cohort/report flow and one unchanged fingerprint.
- The prior live-baseline negative recommendation remains valid for that cohort and is not overwritten.

## Remaining Delivery Decisions

Product intent is fully specified. Delivery may choose the smallest reversible configuration shape that makes the controlled cohort executable and clearly non-default. If delivery discovers that the user intended immediate default-starter replacement instead of evaluation-only use, stop and return that as a separate product outcome for explicit confirmation.

## Risks And Dependencies

- A poorly named or shared resource could be mistaken for default-deck promotion; the delivery shape must remain explicitly evaluation-only.
- The controlled cohort may still reveal that the expanded machine is weak or confusing; that result would inform later intake, not authorize tuning by itself.
- Whelp-clear and Fortify/Slow evidence depend on the existing accepted contracts and should not be over-claimed from unrelated runs.
- The project must preserve one unchanged fingerprint per cohort or the recommendation becomes misleading.

## Approval Record

The user requested on 2026-08-13 that Elian's deck be updated with the new cards so the project can run an accurate evaluation. PM records the smallest approved interpretation as an evaluation-only controlled Elian test-deck cohort, not a default-starter replacement. This item is authorized for delivery planning only. The Orchestrator must acknowledge this exact path, create separate implementation tracking, preserve the confirmed outcome and non-goals, and route any broader default-deck or tuning proposal back to Product Management and the user.

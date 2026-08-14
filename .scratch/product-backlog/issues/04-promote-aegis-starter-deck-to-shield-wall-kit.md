# Promote Elian starter Deck to the Shield Wall Kit

Status: ready-for-agent

## Player Problem

The live/default Elian Voss starter deck is still the temporary two-card shell (`10x Steady Strike`, `10x Iron Guard`). That shell can prove the base Charge loop and the defensive Riposte trigger, but it cannot actually let players play the intended Shield Wall machine in normal live use because it contains no `Shield Slam`, `Sweeping Blow`, or `Fortify`.

As a result, the default playable deck still communicates "repeat the same basic turn" instead of "prepare the right defense, answer the mechanic, then convert that success into a readable tank payoff." The product has already validated the Riposte Ready feature and separately approved a controlled evaluation deck; the user now wants the playable default deck itself changed.

## Desired Outcome

Replace the live/default Elian Voss starter deck with the documented twenty-card Shield Wall list:

- `8x Steady Strike`
- `6x Iron Guard`
- `2x Sweeping Blow`
- `2x Fortify`
- `2x Shield Slam`

Player-facing promise: the default Elian deck should now let players naturally encounter the full first-pass tank loop in live play — defend the line, earn a visible opening, spend that opening with `Shield Slam`, and make at least one optional branch decision beyond repeating the same attack every turn.

This improves role gameplay because the default deck now better matches the MMO-tank fantasy already established in the canon: mitigation, mechanic response, add control, and a prepared payoff instead of a flat damage routine.

## Scope

- Change the live/default Elian Voss starter deck to the approved five-identity, twenty-card Shield Wall list.
- Update the canonical starter-deck documentation so the live/default list and its role explanation are no longer out of date.
- Preserve the already approved Riposte Ready outcome and its authored `Shield Slam` payoff inside the new default deck.
- Reuse existing evaluation and validation paths where helpful, but treat this as a default-deck/product-content change rather than only an evaluation cohort.

## Explicit Non-Goals

- No card-value retuning, rule redesign, or new mechanic invention.
- No general deckbuilding, progression, or loadout system work.
- No Interception, multi-Hero targeting, or other deferred Elian scope.
- No encounter pacing, seed, hand-guarantee, or teaching-order change unless a separate product decision is raised.
- No claim that this change alone proves the deck is balanced, final, or ready for broader promotion beyond the current starter-deck replacement.
- No rewriting of the already closed live-baseline cohort result; that result remains historically true for the old two-card starter.

## Acceptance Evidence

Before this intake closes as delivered, evidence must show that:

1. The live/default starter deck resource now uses exactly `8x Steady Strike`, `6x Iron Guard`, `2x Sweeping Blow`, `2x Fortify`, and `2x Shield Slam`.
2. The previous evaluation-only controlled configuration is no longer the only place where that five-identity list exists; the default playable Elian deck now reflects it.
3. Canonical content documents that describe the live/default Elian starter deck are updated so they no longer describe the old two-card shell as current.
4. Deterministic validation confirms the starter deck is authored correctly and the changed default deck does not silently alter unrelated rules.
5. If delivery reuses the controlled evaluation path, its evidence clearly distinguishes "default deck now changed" from the earlier evaluation-only authorization.
6. Any follow-up recommendation about play-feel, balance, or promotion beyond this starter-deck change is recorded separately rather than inferred from implementation.

## Affected Areas

| Area | Product impact |
| --- | --- |
| Design | Owns the starter-deck intent, the live/default list, and any canonical wording that explains why this is now the active Elian shell. |
| Architecture | Applies the default-deck content change in the smallest correct way and preserves existing validated Riposte and deck-evaluation seams. |
| Test Automation | Verifies exact deck composition, default-deck replacement, and that the existing evidence path remains truthful after the change. |
| UI/UX | Re-enters only if the new default mix exposes a real readability or presentation problem in normal play. |
| Engineering Enablement | Reuses existing content validation and cohort/report contracts only if a bounded update is needed to reflect the new default deck. |

## Canonical Documents To Consult Or Update

- [CONTEXT.md](../../../CONTEXT.md): canonical Riposte Ready and Shield Slam payoff rule.
- [Elian Voss design](../../../docs/content/heroes/elian-voss-design.md): controlled twenty-card Shield Wall list and role intent.
- [Elian Voss starter deck](../../../docs/content/decks/elian-voss-starter.md): current live/default deck document that will need to stop describing the two-card shell as current.
- [Character Design Bible](../../../docs/rules/character-design-bible.md): Shield Wall machine, starter-deck shape, and Slot Tension expectations.
- [Deck Evaluation Rubric](../../../docs/content/deck-evaluation-rubric.md): follow-up evaluation language and promotion gate expectations.
- [First Content Pass](../../../docs/content/first-content-pass.md): prior caution that the five-identity list was approved for testing preparation rather than default adoption; this intake explicitly changes that product decision.
- [Controlled Elian test-deck evaluation proposal](03-controlled-aegis-test-deck-evaluation.md): prior evaluation-only boundary that this new user-approved outcome supersedes for the live/default deck.
- [Project coordination ledger](../../../docs/artifacts/project-coordination.md): active ownership, dependent delivery work, and handoff state.

## Confirmed Product Decisions

- The user now explicitly wants the live/default Elian starter deck changed now, not merely evaluated in a separate non-default cohort.
- The target live/default list is exactly `8x Steady Strike`, `6x Iron Guard`, `2x Sweeping Blow`, `2x Fortify`, and `2x Shield Slam`.
- This is a distinct product outcome from proposal 03's evaluation-only controlled cohort.
- The closed baseline cohort remains historically valid for the old default deck and must not be rewritten.
- Riposte Ready, its visibility/recording requirements, and Shield Slam `+2` payoff remain unchanged.

## Remaining Delivery Decisions

Product intent is clear. Delivery may choose the smallest safe migration path from the current default deck to the approved five-identity default deck, including whether to preserve a separate evaluation-only resource for historical comparison. That implementation choice must not blur which deck is the live/default one after delivery.

If delivery discovers that changing the default deck now forces a broader product decision about encounter pacing, guaranteed draws, or starter-deck teaching order, stop and return that new outcome to PM and the user instead of inferring it.

## Risks And Dependencies

- This intake intentionally overrides the earlier product boundary in proposal 03 that said the five-identity list was evaluation-only and not yet a default-starter replacement.
- `docs/content/first-content-pass.md` currently frames the five-identity list as a post-gate test list rather than the live default; canonical wording must be reconciled rather than left contradictory.
- Active controlled-cohort delivery may already be in flight; the Orchestrator should fold or reroute that work carefully so the new default-deck outcome is explicit.
- Any later claim that the new starter deck is well-balanced or fully taught still needs separate evidence; this intake approves the content change itself, not its final tuning verdict.

## Approval Record

On 2026-08-13, after reviewing the evaluation-only limitation, the user explicitly chose the broader product outcome: replace the live/default Elian starter deck now and send that change to the Orchestrator to handle. PM records this as a separate approved intake so delivery does not silently reinterpret proposal 03.

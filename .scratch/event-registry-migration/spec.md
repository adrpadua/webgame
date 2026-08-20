# Event Registry Migration

Status: active

## Triggering decision

[ADR 0041](../../docs/adr/0041-dispatch-every-triggered-effect-from-one-event-registry.md) (registry, ordering rule, sequencing) and [D-085](../../docs/content/design-decision-log.md) (the `host_takes_damage` split). Routed as Engineering Enablement per the [operating contract](../../docs/agents/engineering-enablement.md); the ledger row is the handoff record. Landed after Healer PR #126 by decision, so the migration sweeps the Healer wave in the same pass.

## Outcome

Every triggered effect — Counter Reader, Signature Grant, and whatever subscribes next — dispatches from one event registry: one table naming, per event, its payload keys, summable effects, and askable gates. `READABLE_READER_PAIRS`, `EVALUATED_GRANT_WHENS`, and `GATES_BY_WHEN` collapse into it; the two `when` schema enums become one. The damage step raises two named events: `host_damage_incoming` (pre-mitigation; subscribers may change the number) and `host_takes_damage` (post-resolution; subscribers react). Behavior-preserving except the D-085 rename.

## Delivery sequence

1. **Architecture** ([issue 01](issues/01-registry-and-migration.md)): the registry table and raise sites, the enum/catalog merge, the D-085 content rename, subscriber ordering, and fact-detail recording.
2. **Test Automation** ([issue 02](issues/02-independent-verification.md)): the ordering test on the Elian + Maren duo, the sealed-Record replay evidence, and independent verification of the behavior-preservation claim.
3. **Design** as bounded user ([issue 03](issues/03-canonical-doc-sync.md)): the authoring-facing docs say `host_damage_incoming` where they teach the modifier moment.

## Settled constraints (no re-litigation)

- Subscriber order: raise order → party seat order for Hero hosts, board-entity creation order otherwise → authored index within a host. Stated in ADR 0041; pinned by test, not by fingerprint alone.
- Fact detail records matched subscribers and contributions when at least one matches; zero-match raises record nothing.
- The reaction keeps the name `host_takes_damage` (the Riposte is untouched); Sundered and Seared move to `host_damage_incoming`.
- Underwritten and Fortified stay engine-named — the registry does not absorb the engine-escape-hatch boundary; it cites it.
- The content-fingerprint cohort restart at landing is accepted as its own clean boundary. No new evaluation cohort.

## Non-goals

No resumable resolution, response windows, or subscriber interruption (researched separately in the [EDOPro note](../../docs/content/research/2026-08-20-edopro-engine-modernization-lessons.md); a future ADR). No `on_enter_hex` subscription — that is [D-086](../../docs/content/design-decision-log.md), Proposed, decided on its own once the registry exists. No boolean gate logic. No new events beyond the two the damage step already resolves. No balance, tuning, or UI change.

## Acceptance evidence

- Existing suite green (549 tests at intake) with the enum-agreement assertion in `engine.test.ts` deleted, not updated — the merged enum is what it was standing in for.
- The new ordering test: two subscribers staged on one event in the Elian + Maren duo, asserting the stated sequence.
- A sealed Encounter Record replayed under the new dispatch path with `finalStateMatches` and a matching fingerprint (the Brand trial duo Scenario is the preferred subject).
- `verify:local` green; catalog refuses a modifier effect on the reaction moment and vice versa, by load error naming the card.

## Return protocol

Assignments and completion use the mandatory return packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet).

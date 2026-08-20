# 01 — Registry, raise sites, and the D-085 rename

Status: delivered (Architecture: this session; PR #128)
Owner: Architecture
Depends on: nothing; blocks issues 02 and 03

## Scope

1. One event table under `web/src/engine/` keyed by event id: payload keys, summable effects, askable gates. `READABLE_READER_PAIRS` (`counters.ts`), `EVALUATED_GRANT_WHENS` and `GATES_BY_WHEN` (`signature.ts`) collapse into it.
2. Convert the eight dispatch call sites (`readerSum` ×4, `evaluateGrantsFor` ×4) into raises against the table. The damage step raises `host_damage_incoming` (pre-mitigation, from `applyDamage`) and `host_takes_damage` (post-resolution, from the `damage` action resolution).
3. Merge the two `when` enums in `content/schemas.ts` into one; merge the two catalog validation branches in `content/catalog.ts` into one check against the table.
4. D-085 rename: `data/counters/sundered.json` and `data/counters/seared.json` author `host_damage_incoming`; `data/cards/elian_riposte.json` unchanged. Template `docs/content/templates/counter.json` follows.
5. Subscriber ordering per ADR 0041: raise order, then party seat order (`partyHeroIds`) for Hero hosts and board-entity creation order otherwise, then authored index within a host.
6. Fact detail on the raising action records matched subscribers and contributions when ≥1 matches; nothing on zero matches.

## Bounds

Behavior-preserving except the rename: any other authored-behavior change is a defect. Delete the enum-agreement assertion in `engine.test.ts` rather than updating it. Engine-named Counters (`FORTIFIED`, `UNDERWRITTEN`) stay engine code.

## Evidence

`npm test` green; `verify:local` green; the catalog load error names a card authoring a modifier effect on the reaction moment (and vice versa).

## Implementation notes (Architecture return, part 1)

- The registry is `web/src/engine/events.ts`: `EVENT_REGISTRY` (four rows: `damage_incoming`, `damage_resolved`, `slot_fired`, `round_start`), the derived catalog guards, `hostOrder`, and the four raise helpers. A module-load completeness check refuses an authored `when` no row hears — the single successor to both old guard tables and the deleted enum-agreement test.
- One authored `when` vocabulary: `AUTHORED_WHENS` in `content/schemas.ts`, shared by `counterReaderSchema` and `signatureGrantSchema`.
- The subscriber-kind order within a raise is the registry row's `hears` order (Grants before Readers on `slot_fired`, Reader payout before Grant on `round_start`), matching prior behavior; host order is seat order per ADR 0041. This refines the ADR's ordering rule one level down without changing it.
- Matched subscribers ride `subscriber_matches` in the raising action's fact detail when at least one matched (Q9).
- One mutation-audit entry re-anchored from the deleted `takenDelta` line to the raise's stance-selection line in `events.ts`.
- **Found, preserved, flagged for issue 02/Design:** the dealing-side Grant (`host_deals_damage` reaction — Maren's earn) evaluates against a *copy* of the resolution fact, so its `signature_event` never reaches the fact stream; the Charge mutation is what survives. Same pattern on `slot_fired`. Pre-existing behavior, reproduced exactly; whether the fact loss is intended is a question for the verification pass.

## Evidence (Architecture return, part 2)

- `npm test`: 548 passed (549 minus the deleted enum-agreement assertion), including the committed Brand-trial duo scenario replaying under the new dispatch path with the renamed Counters.
- `verify:local` green end to end (browser smoke via `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium` — the container's Chromium predates the repo's Playwright pin).
- Mutation audit: **103/103 caught, 0 survived, 0 stale.** Three ADR 0037 earn mutants re-anchored onto the registry dispatch (`events.ts`), plus the D-047 incoming-Counters mutant onto the raise's stance selection; all four killed by existing tests.
- `npm run log:ids`: every decision id free against origin/main.

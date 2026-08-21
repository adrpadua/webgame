# 01 — Exhaustive fire-target enumeration (P0)

Status: delivered (this session)

Make fire-action enumeration exhaustive across all five schema target families (`none`, `piece`, `hex`, `ally`, `board_slot`), keeping every constructed command filtered through the single `legality()` predicate, and add the target-family contract matrix so a family can never again be added to the schema without an explicit enumeration decision.

The confirmed defect (reviewer's reproduction, verified at source): `fireTargeting` had an `'ally'` mode, but `legalActions`' fire expansion was a two-way ternary handling only `'hex'` and `'piece'` — `'ally'` fell through to the untargeted branch, which legality refuses, so a prepared Braced Escort answered "legal" to `legality()` and "nothing to play" to `legalActions()`. All seven shipped ally-target cards (Maren's kit) were invisible to the enumeration API the AI, hints, and simulation read; human play survived only because the click path asks `fireTargeting` directly. `board_slot` was structurally absent from both — latent, since no shipped card uses it.

## Delivered

The same defect had three homes — the enumeration and two UI consumers that switch on `mode` — and all three now decide every family:

- `legalActions.ts`: the fire expansion is a named `fireCommands(targeting, heroId, slotIndex)` with an exhaustive switch — `hex` maps legal hexes, `piece`/`ally` map legal target ids, the new `board_slot` maps legal Slot indexes, `none` offers the bare fire. The `default` binds `targeting.mode` to `never`, so a sixth family refuses to compile until this switch decides it.
- `fireTargeting`: new `'board_slot'` mode and `legalSlotIndexes` field, filtering the firing Hero's bar through `legality()` with `targetSlotIndex` — no range, prepared-Slot, or Counter-host rule reimplemented.
- `ui/actionBar/slots.ts` `slotCanFire`: was the same fall-through in UI clothing — ally Slots never lit, because the fallback asks the untargeted question legality refuses. Now an exhaustive switch with the same `never` guard.
- `board/PhaserBoard.tsx`: ally targets light their hexes like piece targets; `board_slot` correctly lights nothing on the board. `ui/overlays/TargetingBanner.tsx` says "Pick a Slot" for the latent family.

Deliberately not built: a board-side click path for completing a `board_slot` fire (no shipped card can reach it; the Workbench affordance is that family's first consumer's problem, per the no-speculative-UI rule).

## Tests

- `engine/legalActions.test.ts` (new): the target-family contract matrix. Compile-time half — `MODE_FOR_FAMILY` and `FAMILY_CARD` are `Record<Card['target_type'], …>`, so a new schema family fails typecheck until the matrix decides it. Runtime half — per family, every candidate payload is filtered through `legality()` and the enumeration must equal that legal set exactly (`toEqual`, order and all), with a non-vacuousness assertion. Plus the shipped Maren path: a prepared Braced Escort enumerates a fire per legal ally (self-cover included) and drops a Downed ally.
- `ui/actionBar/slots.test.ts`: an ally-covering Slot lights.

Red proven before green: with the test files applied to the pre-fix sources, exactly the `ally` and `board_slot` matrix rows, both Maren tests, and the slots ally test fail (6 failures); `none`/`piece`/`hex` rows pass unchanged, matching the "continue to behave unchanged" criterion.

## Evidence

(gate results stamped below on completion)

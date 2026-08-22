# 05 — State each content concept once

Status: delivered (this session)

The content layer was split by mechanism, not by concept: `schemas.ts` held every shape with zero cross-field rules, `buildCatalog` held all 596 lines of meaning in eleven sequential passes 400 lines away, and the derived properties (`cardChargeCap`, 24 call sites) rode as a grab-bag on the catalog's tail. 31 of 39 `catalog.ts` commits also touched `schemas.ts` — adding a Card field meant editing the shape in one file and hand-writing its rule in another.

## Delivered

Each concept is now one module under `content/`, holding its schema, its cross-field validation, and its derived properties together:

- **`card.ts`** — the fired card's content grammar whole: `cardSchema` with its reader/grant/full-charge sub-schemas and the Charge Modifier, the 196-line card pass, `HOST_TARGETS`, `cardReachingEffects` (with the D-009 board_slot exclusion comment intact), and the accessors (`cardChargeCap`, `cardWindowSpeed`, `cardNeedsPieceTarget`).
- **`counterDef.ts`**, **`minionDef.ts`** (with `minionMoves`), **`program.ts`** (Beat + Program shapes and rules, reading kind facts from the `beats.ts` registry, never re-declaring them), **`hero.ts`** (with the two-way Signature contract), **`encounter.ts`** (seats, arena, thresholds, decks, scenario references).
- **`grammar.ts`** — the shared primitives (`axialSchema`, `AUTHORED_WHENS`), kept below the concept modules so the facade can re-export both layers without an init-order cycle.
- **`schemas.ts`** is now the simple shapes with no rules of their own (Keyword, Boss, Hazard), the Scenario command seam with its two-way guard, `ContentCatalog` (moved here so concept modules take it without a cycle), and the **compatibility surface**: every name ever imported from it is re-exported, which is why this move needed zero edits anywhere else.
- **`catalog.ts`** keeps what composition owns: the sourced-payload plumbing, `buildCatalog` as parse-then-validate in the exact original pass order (the engine-keywords completeness check stays inline — it is a catalog-level fact, not a concept's), and `reachableEncounterContent`. 937 lines down to ~350.
- **`requireKeyword`** moved to `engine/keywords.ts`, beside the reference tables it polices — typed structurally so the keywords module never imports a content schema.

## Evidence

Behavior-preserving by construction: every pass body, schema, and comment moved verbatim (scripted slicing, not retyping); pass order preserved exactly; zero test-file edits — the facade held every existing import path, proven by the suite passing untouched. All **10 mutation anchors** re-pointed from `catalog.ts` to their concept modules, each verified to match exactly once. Typecheck, lint, 665/665 before the gate.

(gate results stamped below on completion)

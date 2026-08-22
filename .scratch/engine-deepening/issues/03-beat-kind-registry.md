# 03 — One owner for the Beat kind vocabulary

Status: delivered (this session)

The Boss Beat kind union was re-declared in three places with no owner: validation predicates in `catalog.ts` (`RANGED_BEAT_KINDS`, `beatReachReasons`, `beatMoves`), the Escalation step's `DEMANDS` table keyed on **bare strings** — the survey's one live hazard: `beat.kind === kind` with a stale string after a kind rename would silently never match, and the party would never be charged for the demand — and the resolution switch in `timeline.ts`.

## Delivered

- **`beats.ts`** — the kind vocabulary as one table, the `EVENT_REGISTRY` shape applied to the engine's other closed kind set. `BEAT_REGISTRY: Record<BossBeat['kind'], row>` carries each kind's facts: `reaches` (must author `range_tiles`), `movesWithoutAllowance` (`advance_toward_player`'s identity clause), and `demand: 'pool' | 'program' | null`. The `Record` over the schema union refuses to compile until a new kind declares its row — no silent fallthrough at authoring time. `beatReachReasons` and `beatMoves` moved here verbatim, now reading the registry; `catalog.ts` imports them, keeping every validation call site (and its mutation anchors) untouched.
- **The hazard closed**: `DEMANDS.kind` and `demandTerms`' parameter are typed `BossBeat['kind']` — a renamed kind is now a compile error at the exact table that would have gone quiet.
- **Two-way load guard** (the ADR 0041 discipline): every registry row declaring a demand must have its standing question in `DEMANDS` at the declared scope, and no `DEMANDS` entry may ask a question the registry doesn't declare — thrown at module load, because a demand-carrying kind the table forgot would never charge and nothing else would notice. The existing scope-flip mutation anchor now trips this guard as well as its behavioral test.
- **Deliberately left alone**: `timeline.ts`'s resolution switch (the deep implementation — the registry owns kind *facts*, not resolution bodies), `refreshTelegraphs`, and `beatCardModel.ts`'s presentation reads. `minionMoves` and `cardReachingEffects` stay in `catalog.ts` — they are Minion and Card rules, not Beat-kind vocabulary.

Behavior-preserving: types, a table, and verbatim predicate moves; `DEMANDS` entry texts byte-identical (three mutation anchors sit on them); zero test edits.

## Evidence

Full isolated gate green end to end: casing guard silent, log:ids clean, 660 tests, lint, build, **SMOKE PASSED** with replay fingerprint match (the settle-fixed readability check holding), mutation audit **130/130 caught, 0 survived, 0 stale** — the three DEMANDS-entry anchors and the scope-flip mutant all killing through the unchanged entry texts and the new load guard — inner EXIT:0. Survey correction recorded: `RANGED_BEAT_KINDS` was already typed by an earlier change; the escalation table was the live half of the hazard.

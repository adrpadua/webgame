# 01 — The selector/query foundation (P0)

Status: delivered (this session)

## Scope

One closed, deterministic query vocabulary for deriving entities and hexes from authoritative state — the handoff's highest-return primitive, and the convergence point for the parallel selection projections the engine grew one at a time (`fireTargeting`'s per-family enumerations, `selectBeatTarget`, `minionIntent`'s nearest-Hero). Closed means closed: a selector the vocabulary lacks is an explicit engine change, never a predicate parameter.

## Acceptance (the handoff's seven)

1. nearest living Hero  2. all adjacent Enemies  3. all Enemies within N hexes  4. lowest-Health living ally  5. entities carrying Counter X  6. empty hexes within N  7. deterministic tie-breaking — stated as a rule, pinned by test.

## Convergence plan

The module ships with its acceptance tests and its first consumer conversions only where semantics are provably identical (byte-identical replays are the bar). Remaining projections converge one per change, never in a sweep.

## Validation

Full local gate; new mutation-audit entries for the vocabulary's load-bearing rules (tie-break, filter sense, ordering).

## Delivered

- **`web/src/engine/selectors.ts`** — `selectEntities` / `selectHexes` over closed unions: `EntitySubject` (`all`/`heroes`/`party`/`enemies`/`minions`/`boss`), `EntityFilter` (`is: living|downed|on_board`, `within`, `adjacent`, `has_counter`, `not`), `EntityOrder` (`id`/`seat`/`nearest`/`furthest`/`lowest_health`/`highest_health`), `HexFilter` (`is: empty|occupied`, `within`, `adjacent`, `has_counter`). Filters AND together (the Reader-gate grammar); every union is `never`-guard exhaustive; a distance filter/order without `from` throws loudly. Determinism rule stated in the header and pinned by test: stable two-key sort, lexicographic (code-unit) final tie-break, hexes in canonical sorted hex-key order, `limit` after ordering. Exported through `index.ts`. Recorded as **D-111**.
- **`selectors.test.ts`** — the handoff's seven acceptance demonstrations as exact-order assertions (nearest living Hero; adjacent Enemies; Enemies within N boundary-inclusive, `within: 1` vs `within: 0`; lowest-Health living ally; Counter carriers via a real `place_counter` resolve; everyone-but-the-source; tie-break determinism nearest vs furthest plus id-sort stability), the no-`from` throw, and three hex demos (empty-within, occupied+limit, hex Counter). 11 tests, all staged through real resolves on the shipped catalog.
- **First consumer converged**: `minionIntent`'s hand-rolled nearest-Hero scan became `selectEntities(state, { subject: 'party', from, where: [{ is: 'on_board' }], order: 'nearest' })` — provably identical (same base set, same distance sort, ASCII id `localeCompare` ≡ code-unit compare), full suite green unchanged.
- **Three mutation-audit entries** (audit now 133 entries): tie-break flip (`idCompare` sign reversal), filter sense (`is: living` inverted), range boundary (`<=` → `<`) — each anchored to a unique exact string in `selectors.ts`, each guarding D-111.

## Evidence

Typecheck clean (after binding the switch discriminant so the `never` guards survive narrowing); `selectors.test.ts` 11/11; full suite 676/676 across 51 files; lint clean; `log:ids --fix` assigned D-111 and carried the citation into `mutate.mjs`, `minions.ts`, `selectors.ts`.

Full isolated gate green end to end on the delivery commit: casing guard silent, log:ids clean, 676 tests across 51 files, lint, build, **SMOKE PASSED** with replay fingerprint match (`60f041e5…`), and the mutation audit at **133/133 caught, 0 survived, 0 stale** — the three new selector entries killed by the acceptance battery. Inner EXIT:0 (read from the gate log's own exit line, never the wrapper's).

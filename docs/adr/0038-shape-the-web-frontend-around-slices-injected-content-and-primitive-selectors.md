# Shape the web frontend around slices, injected content, and primitive selectors

Renumbered from 0035 on 2026-08-20. Two branches were open at once and both took that number; the Party ADR reached `main` first (PR #118), so this one moved. The decision itself is unchanged.

The React app under `web/src` is organised by four rules: the Workbench store is composed from named slices rather than written as one object; the content catalog is injected through context rather than held as store state; selectors return primitives, because the engine's clone contract means nothing else can compare; and the Phaser board talks to the store imperatively, never through render. This ADR records those four and the reasoning that forces each one, because three of them look like ordinary style preferences and are not.

## The store is one store, in slices

The Workbench store holds two unrelated things: the Encounter timeline — every state the session has passed through, and the actions that append to it — and the in-flight gesture, which is whatever the player has begun and not yet committed. `sessionSlice.ts` and `interactionSlice.ts` own one each, and `workbench.ts` composes them.

**They stay one store.** The obvious move is two stores, one per concern, and it is wrong here: a gesture resolving *is* a timeline entry. `hexClicked` ends in `submit`; `advance` clears every gesture in flight; `payForMove` reaches across to `cardDroppedOnHex`, which reaches across to `submit`. Split into separate stores, those handoffs cross a boundary and the two halves can disagree about whether a move is still pending — which is a bug that renders as a Hand offering to pay for a step that already happened. As slices the handoff is a plain call through `get()`, and each concern still gets its own file, its own documented state shape, and its own reasons.

The shared reset is a value, not an action: `CLEARED_INTERACTION` is what "no gesture in flight" means, spread into every session transition, so a restart and a time travel cannot drift apart on the definition. Inspection is deliberately outside it — undo keeps an open Stat Panel, because a player undoing a shot is watching the bar it moved, and a session transition does not.

Two things that were living in the store are not state and are now elsewhere: the `window.__workbench` automation bridge (`devBridge.ts`) and the hot-update session preservation (`hmr.ts`). A store module that installs a global on import is a store that cannot be imported without side effects, which is a cost paid by every test that wants the timeline.

## The catalog is injected, not subscribed

The authored content is built once at import, validated by the schemas (ADR 0020), and never written again. It was a field on the store, which meant a dozen components opened a store subscription to read a card title — a re-render slot spent watching a constant that cannot change.

It is served through `CatalogProvider` / `useCatalog()` instead. Beyond removing the dead subscriptions this buys a seam the tree did not have: a subtree can be rendered against a different catalog by wrapping it, rather than by reaching into a module global. The default is the loaded catalog, so a component rendered without a provider still works — the provider exists to override, not to switch the app on.

**The callers that render outside React take the singleton directly**, from `store/catalog.ts`: the Phaser board, and the imperative first-turn reading the board asks for. Neither has a React tree to read context from, and giving them a hook they cannot call would be worse than the honest import.

That distinction is a lint boundary rather than a convention, in the same idiom ADR 0019 uses to keep the engine pure: `src/ui/**` may not import the `catalog` singleton, with `useFirstTurn.ts` the one listed exception — it is the module the board calls into. A component reaching for the singleton fails the build with the rule naming this ADR.

## Selectors return primitives, because the engine clones

This is the rule that looks arbitrary and is not.

`resolve` and `advancePhase` both hand back a deep `structuredClone` of the Encounter. That is the right contract for a rules engine — nothing the renderer holds can alias state the engine is about to mutate — but it means **the state tree has no structural sharing whatsoever**. `state.heroes[id]` is a brand-new object after every action, whether or not that Hero changed. `state.board` likewise. Every nested object, every time.

So a selector that returns an object from inside `EncounterState` gives its component nothing at all: zustand compares with `Object.is`, and the reference is always new. `selectHero` is not a narrower subscription than `selectState` — it is the same subscription with more indirection. The only selectors that can actually cut a render are the ones that come back as a primitive and compare by value.

That is the rule for `selectors.ts`: **return a primitive.** A component that needs several fields subscribes to each separately rather than having the module build an object for it, because a fresh object would defeat the comparison the module exists to make possible. `selectState` is the deliberate exception and the escape hatch — the entry's state object is stable between actions, so subscribing to the root is correct for anything that genuinely reads the whole Encounter, and it re-renders on every action, which is exactly what that means.

**Most components keep the root subscription, and that is the intended outcome.** PhaseControl, CoachMark, the Hand and the Slots each read broad enough slices that narrowing them would be contortion — reshaping props to make a memo boundary bite, rather than architecture. The narrowing is applied where a component reads a handful of primitives and pays for the root: PhaseBanner, which runs two timers keyed on five values and was re-running both effects on every Charge to conclude nothing had happened, and OutcomeBanner beside it.

**No blanket memoization.** The app resolves a few actions per second and its components are small; there is no measured render cost here to fix, and the clone contract above means most memo boundaries would not hold anyway. `React.memo` sprinkled across the tree would be maintenance weight bought with nothing.

## The board is imperative, and stays that way

`PhaserBoard` mounts the Phaser game once with an empty dependency list and subscribes to the three stores with `store.subscribe`, pushing snapshots into the scene. It never re-renders React on a state change; the React component is a sized `div` and a set of pointer handlers.

This is the correct boundary for a canvas that owns its own render loop, and it is worth naming so nobody "fixes" it into a `useWorkbench(selectState)` and a `useEffect` — which would re-render the wrapper on every action to hand Phaser data it could have read itself, and would make the feedback sequencing (which depends on comparing the previous timeline entry by identity) race the render.

## Folder shape

`src/ui` is grouped by feature — `actionBar`, `chrome`, `hand`, `hero`, `overlays`, `onboarding`, `common`, `debug` — with each group holding its components together with the pure module that decides what they show and that module's tests. `App.tsx` sits at the root, because knowing where everything is is its job.

The repo's existing convention is upheld and is the reason component tests are thin on the ground: **the decisions come out into pure `.ts` modules** — `handFace`, `slots`, `heroFrame`, `beatCard`, `notifications`, `firstTurnScript`, `sessionTimeline` — which are tested directly, leaving the components as arrangement. A component that only arranges is one a browser check can cover, and the smoke suite does.

## Accepted costs

Three files where there was one is a real cost when the thing you are chasing crosses the slice boundary — a gesture that ends in a timeline entry now spans `interactionSlice.ts` and `sessionSlice.ts`, and following it means opening both. The composition in `workbench.ts` is what makes that navigable, so it has to keep naming what each slice is for.

The primitives rule is the one that is *not* enforced, and it is the easiest to violate by accident: a selector returning an object type-checks, lints, runs, and silently does nothing, and nothing in the toolchain will say so. The note at the top of `selectors.ts` is the only thing holding it, which makes that comment load-bearing documentation. Whether it could be linted — a rule on the declared return type of exports in that one file — is open; it was not attempted here because a shallow-comparing selector is a legitimate future exception and a rule that forbids it outright would be wrong.

`useCatalog()` has a default value, so a component rendered without a provider silently gets the loaded catalog rather than failing. That is deliberate — it keeps the seam optional — but it means a test that means to inject a variant catalog and forgets the wrapper passes against the real one.

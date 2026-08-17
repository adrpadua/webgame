# Card And Action Bar Design Grill

Date: 2026-08-13

Historical artifact: this records a design grill run against the Godot client, which is frozen (ADR 0019). Its reference synthesis and hierarchy reasoning still hold; its file paths, node names, and probe commands do not. The current interface direction is [oathcraft-interface-direction.md](../content/oathcraft-interface-direction.md).

Status: accepted design direction. This record captures the fast-forward design grill for tightening the portrait Hand and Action Bar. It refines the historical [layout and card design grill](layout-and-card-design-grill.md) without changing gameplay rules.

## Reference Synthesis

- Use `Yu-Gi-Oh! Duel Links` for portrait compression and a low, thumb-reachable Hand.
- Use `Magic: The Gathering Arena` for board-first hierarchy and clear focus elevation.
- Use `Legends of Runeterra` for selected-card enlargement and inspection hierarchy.
- Use `Marvel Snap` for compact silhouettes, strong state contrast, and immediate visual impact.
- Do not copy one product's complete layout or visual identity.

## Accepted Decisions

| Area | Accepted direction |
| --- | --- |
| Primary surface | Keep the board dominant. Limit the Bottom Interaction Zone to direct input. |
| Hand shape | Use a shallow centered fan with controlled overlap. Raise and separate the selected card. |
| Compact Card | Use a portrait shell with timing, type, artwork, title, and Charge Value. Keep rules text in Card Inspection. |
| Action Bar | Keep a separate row of two persistent Slots. Do not make it look like a second Hand. |
| Slot anatomy | Show one landscape Top Card with visible tucked edges for the Charge Stack. |
| Drop meaning | Label legal destinations as `LOAD`, `REPLACE`, `CHARGE`, or `MOVE` during selection and drag. |
| Slot states | Give Empty, Loaded, Ready, Primed, Activated, and Locked states distinct shape, label, and motion cues. |
| Interaction | Preserve drag, tap selection, tap alternatives, and hold-to-inspect. |
| Motion | Use short state feedback. Provide static equivalents when reduced motion is active. |
| Accessibility | Preserve 44 by 44 pixel targets, visible focus, text with icons, and non-color state cues. |

## Visual Hierarchy

1. Board and current tactical targets
2. Selected Compact Card or actionable Slot
3. Remaining Hand and Action Bar
4. Tracker and contextual Continue control

The Hand must remain visually stronger than empty Slots. A Loaded Top Card becomes stronger only when it is Ready, Primed, selected, or a legal drop destination.

## Compact Card Anatomy

- Upper-left: timing badge with icon and short label where space permits.
- Upper-right: type badge with icon; selected or inspected states expose the full type label.
- Center: artwork as the largest field.
- Lower band: card title, with no rules paragraph.
- Lower edge: Charge Value shown as a clear icon count.
- Selected state: lift, enlarge, and reveal the full title without hiding every adjacent card.

## Slot Anatomy And States

### Terminology Decision: Loaded

| Field | Decision |
| --- | --- |
| Status | Confirmed presentation vocabulary. |
| Owner | Design owns the term; UI/UX projects it; QA verifies derived state and accessible labeling. |
| Affected areas | `CONTEXT.md`, Action Bar/Slot UI labels and tooltips, visual-state probes, and UI/UX acceptance language. No card, engine, Encounter Record, or gameplay-rule behavior is affected. |
| Canonical term | **Loaded**. |
| Exact meaning | An occupied Slot with a `top_card` and an empty Charge Stack. It has an installed ability but cannot activate until it receives at least one Charge. |
| Rationale | It names the visible installed-module state without falsely implying activation (`Ready`), full Charge (`Primed`), spent-use state (`Activated`), or prohibition (`Locked`). It also matches the existing `LOAD` interaction verb without treating loading as a separate gameplay system. |
| Rule impact | Presentation language only. The state is derived from the existing engine snapshot and adds no action, timing permission, cost, or cleanup behavior. |

- Empty Slots show a clear receptacle and `LOAD` cue.
- Loaded Slots show an installed Top Card with an empty Charge Stack and `CHARGE` cue during a legal player window; they have no activation affordance.
- Ready Slots have at least one Charge, are in their Top Card's matching player window, and have not activated in that window. They show an activation symbol and restrained pulse.
- Primed Slots use a unique full-stack crest, not the Ready treatment.
- Activated or Locked Slots use a static state mark and reduced emphasis.

- The Top Card uses a compact landscape crop and remains visually distinct from Hand cards.
- The Charge Stack appears as tucked card edges beneath the Top Card, with a filled-versus-capacity readout.
- Occupied Slots show `REPLACE` during the Loadout Step and `CHARGE` during player windows.

## Interaction Feedback

When a Compact Card is selected or dragged, dim unrelated controls and mark every legal outcome on its destination. A Slot must state the resulting action, and legal movement hexes must state or symbolize `MOVE`. Successful loading, tucking, activation, and Full-Charge Cleanup use short motion that does not resize the overall layout.

## Implementation Decisions

| Decision | Status | Rationale | Owner | Affected areas | Follow-up |
| --- | --- | --- | --- | --- | --- |
| Board-first hierarchy | Confirmed | Tactical position must remain the largest and first-read region on phone and desktop. | UI/UX | Responsive layout, Bottom Interaction Zone, visual captures | QA verifies `390x844` board dominance and desktop visibility. |
| Portrait Compact Card anatomy | Confirmed | Timing icon, type icon, dominant art, title band, and Charge Value make cards scannable without resting rules text. | UI/UX; Design owns Card semantics | `CardButton`, Card Inspection, presentation probe | Replace prototype-local art only after production licensing is resolved. |
| Shallow Hand fan and selection elevation | Confirmed | Controlled overlap preserves four-card readability in portrait while lift, scale, focus border, and dimming create a clear selected object. | UI/UX | `HandView`, `CardButton`, mobile and desktop captures | QA protects duplicate-card selection so only the tapped instance lifts. |
| Legal board destination presentation | Confirmed | `MOVE` must visualize existing legal adjacent movement, never become a second movement validator. | Architecture owns legality; UI/UX projects it | `Main`, `HexGrid`, `HexTile`, presentation probe | Keep exact-set validation against `HexGrid.can_move_piece_to`. |
| Action Bar and Slot projection | Confirmed | Landscape Top Cards and tucked Charge Stack edges distinguish persistent Slots from portrait Hand cards. | UI/UX; Design owns Slot terms | `ActionBarView`, `ActionBarSlot` | Keep the Action Bar within about one Compact Card height on portrait. |
| Derived Slot state precedence | Confirmed | Existing Slot facts are sufficient; adding engine state would duplicate authority. Precedence is Empty, Activated, Primed, Ready, Locked, then Loaded. | Architecture owns snapshot contract; Design owns labels; UI/UX renders | Slot labels, icons, borders, motion, probe matrix | QA independently verifies every state and illegal CHARGE suppression. |
| Presentation-only selection context | Confirmed | Selection and drag cues must not submit speculative actions, mutate Hand order, or enter Encounter Records. | Architecture owns shared adapter contract; UI/UX owns presentation | `Main`, Hand signals, Action Bar and board context | Reverify records and scene boundary after future shared `Main` changes. |
| Exact-card drag/drop context | Confirmed | A destination may accept only the card that is still present in the current Hand and created that projection. | UI/UX with Architecture constraints | Slot and tile drop acceptance, drag cancel/end | Clear Action Bar and board cues on release or cancellation. |
| Tap destination fallback | Confirmed | Direct manipulation needs an equivalent touch-accessible path: tap one Compact Card, then tap a labeled legal Slot or `MOVE` hex. It must reuse the same existing load/charge/move handlers as drag. | UI/UX owns interaction; Architecture owns action authority | `HandView`, `Main`, Slot and tile selection, tap probe | QA protects load and movement parity; future target types need their own separately assigned contract. |
| Duplicate Card instance selection | Confirmed | A Hand may contain duplicate references to one Card resource, but only the visually tapped Compact Card may lift and dim its siblings. Rules adapters still receive the Card resource. | UI/UX | `HandView` visual-instance state, `Main` Card-resource adapter, presentation probe | Preserve Hand order and verify exactly one selected visual instance. |
| Selected-title fitting | Confirmed | Selection promises the complete title, so long titles must dynamically fit the fixed portrait band instead of clipping or reverting to ellipsis. | UI/UX | `CardButton` title rendering, presentation probe, mobile/desktop captures | Keep the minimum selected-title size readable; revisit the portrait width if future localized titles cannot fit. |
| Inspection behavior | Confirmed | Full rules belong in Card Inspection; hold opens it, release or outside tap dismisses it. | UI/UX | `CardButton`, `CardInspectOverlay`, inspection probe | Preserve tap selection and drag threshold behavior. |
| Accessible state and motion | Confirmed | Icons plus labels, focus borders, and static end states keep meaning independent of color and animation. | UI/UX; QA validates | Hand/Slot/hex controls, reduced-motion setting, accessibility probe | Keep targets at least `44x44`; retain static equivalents when reduced motion is enabled. |
| Reusable presentation validation | Confirmed | Probe-only state staging can verify the workflow without shipping debug controls or telemetry HUD. | QA owns registration/evidence; UI/UX is bounded user; Architecture owns projection contract | `presentation` probe registration and visual capture script | QA independently reruns before handoff closure; keep Whelp/Slow/deck-eval catalog work separate. |

No decision above requires a new ADR or gameplay-rule change. Any future change to Card effects, Slot timing, movement legality, targeting, or Encounter Record content must be routed to Design and Architecture rather than decided in UI/UX.

## Scope Boundary

This direction changes presentation and interaction feedback only. It does not change Card effects, Top Card timing, Charge Value, Charge Stack persistence, Slot Replacement, Stamina, targeting rules, Encounter Records, or the no-combat-log HUD boundary. Placeholder art remains subject to [card art provenance](card-art-placeholder-provenance.md).

## Acceptance Checks

- At `390x844`, the board remains the largest region and all Bottom Interaction Zone controls remain visible.
- The Action Bar stays within about one Compact Card height and no more than one quarter of the Bottom Interaction Zone.
- A first-time player can distinguish Hand cards, Top Cards, and tucked Charge Stack cards without opening help.
- A selected hand card exposes legal `LOAD`, `REPLACE`, `CHARGE`, and `MOVE` destinations as applicable.
- Empty, Loaded, Ready, Primed, Activated, and Locked Slots are distinguishable without color alone.
- Selected cards reveal a complete title; full rules remain available through Card Inspection.
- Drag, inspection dismissal, direct Slot activation, and Continue behavior remain unchanged. Tap fallback is expanded: tap a Compact Card, then tap a labeled legal Slot or `MOVE` hex to submit through the same existing handler used by drag.
- Existing mobile HUD, action-bar art, accessibility, and Encounter Record boundary probes pass; add focused visual/state probes for the new anatomy.

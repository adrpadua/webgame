# 03 — Authoring-facing docs say the split vocabulary

Status: delivered (Design doc sync: this session)
Owner: Design (bounded user), verified by the coordinator

## Scope

Where a canonical doc teaches the modifier moment, it says `host_damage_incoming`; where it teaches the reaction, `host_takes_damage`. Files citing the old single vocabulary: `docs/content/design-team-handoff.md`, `docs/content/authoring-a-new-hero.md`, `docs/content/templates/counter.json` (moved in issue 01), and any current-tense mention in `docs/content/design-backlog.md` / `docs/content/unified-keyword-counter-catalog-sketch.md`. Historical documents (ADR 0037, design proposals, decision-log rows, encounter records) stay as written.

## Evidence

`git grep host_takes_damage docs/content` returns only reaction-moment teaching and historical records; the Design owner confirms an author can learn which moment they are writing from the handoff doc alone.

## Evidence (Design return)

`git grep host_takes_damage docs/content CONTEXT.md` now returns only reaction-moment teaching and historical records:

- **Moved to `host_damage_incoming`** (modifier teaching): the CONTEXT.md Counter glossary entry (now also teaching which moment each word names and citing D-085/ADR 0041), the handoff doc's Counter row (Sundered example included, plus the modifier/reaction paragraph), and the Brand-attrition gate's Seared table.
- **Kept `host_takes_damage`, now with the distinction taught**: the handoff doc's Signature-earn bullets (reaction framing added; `host_damage_incoming` named as Reader-only and refused for Grants) and authoring-a-new-hero's earn table (already reaction-only, unchanged).
- **Stale row fixed in passing**: authoring-a-new-hero's engineering-boundary table claimed "Only `host_takes_damage` is evaluated" — false since D-071; now states the registry boundary (a new event is a registry row plus its raise site).
- **Historical, left as written**: the catalog sketch (D-046–049, marked shipped), the struck-through backlog rank 15, the two design proposals, and all decision-log rows.
- **Flagged, not fixed (out of scope)**: the same engineering-boundary table still lists "A second Hero on the board at once" as unshipped, stale since ADR 0035/D-069 — a doc-hygiene item for Design, unrelated to the split.

Bounded-user check: the handoff doc alone now answers "which moment am I writing?" — Reader = modifier before mitigation (`host_damage_incoming`/`host_deals_damage`), Grant = reaction after the blow (`host_takes_damage`), with the load error named for either word on the wrong side.

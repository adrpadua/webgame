# 03 — Authoring-facing docs say the split vocabulary

Status: blocked-on-01
Owner: Design (bounded user), verified by the coordinator

## Scope

Where a canonical doc teaches the modifier moment, it says `host_damage_incoming`; where it teaches the reaction, `host_takes_damage`. Files citing the old single vocabulary: `docs/content/design-team-handoff.md`, `docs/content/authoring-a-new-hero.md`, `docs/content/templates/counter.json` (moved in issue 01), and any current-tense mention in `docs/content/design-backlog.md` / `docs/content/unified-keyword-counter-catalog-sketch.md`. Historical documents (ADR 0037, design proposals, decision-log rows, encounter records) stay as written.

## Evidence

`git grep host_takes_damage docs/content` returns only reaction-moment teaching and historical records; the Design owner confirms an author can learn which moment they are writing from the handoff doc alone.

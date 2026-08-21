# Authoring Templates

Copy-ready starting points for every authorable content type, stamped into
`data/` by the scaffold tool:

```bash
cd web
npm run scaffold -- hero kessa "Kessa"
npm run scaffold -- card momentum_strike
npm run scaffold -- --list        # every type
```

The scaffold copies the matching template here, sets the `id` and `title`, and
writes `data/<directory>/<id>.json` — refusing to overwrite. Copying a template
by hand works exactly as well; the tool only saves the rename-and-retitle step.

Why these exist: the daily workflow used to be "copy the closest existing
file", and every existing file is Elian's or Embermaw's — so every copy arrived
pre-loaded with Ashen Trial tuning. A template carries only the required fields
and safe defaults, so what you edit next is your design.

Three things to know:

- **Templates are not live content.** This directory is outside the loader's
  glob, so nothing here reaches the Workbench. `templates.test.ts` validates
  each file against its schema, which is why every template parses cleanly the
  moment it lands in `data/`.
- **Placeholder ids all start `new_`.** Rename the id first (the filename must
  match it), and never change it afterwards — ids are stable.
- **Field meanings live in one place.** The authoring contract table in
  [design-team-handoff.md](../design-team-handoff.md) documents every field,
  and `web/src/engine/content/schemas.ts` is the authority when they disagree.
  A copied template with dangling references (a deck card, a program id) fails
  the build by name — that error is the loader telling you the next file to
  author.

There is deliberately no Scenario template: Scenarios are exported from the
Workbench debug rail, never authored by hand.

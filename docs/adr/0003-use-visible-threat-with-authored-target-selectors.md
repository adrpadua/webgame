---
status: accepted, deferred to the multi-Hero milestone
---

# Use visible Threat with authored Target Selectors for boss targeting

Boss actions will normally target the valid Hero with the highest visible `Threat`; dealing damage to the boss gains equal Threat, and `Taunt` sets its user's Threat to one above the current leader. Each Boss Timeline action may instead declare an authored `Target Selector`, such as Tank, Lowest Health, Farthest, or All, and its current predicted target remains visible. We chose this over role-locked targeting or opaque enemy AI because Tank play needs a dependable way to hold the boss, while raid scripts still need precise Healer, positioning, and party-wide checks.

**Deferred, not abandoned.** No entity carries a Threat value in the TypeScript Encounter Engine: boss damage resolves against the single primary Hero, and the `target_selector` and `counter_tags` fields authored on Boss Beats are carried into Resolution Fact context and rendered in a popover without steering anything. This is a consequence of the one-Hero slice rather than a change of mind — with exactly one valid Hero, "which Hero does the boss target" has one answer by construction, so Threat is unobservable rather than unimplemented. The decision above stands as the intended model and becomes live with the multi-Hero party model (`docs/content/design-backlog.md`, Engineering rank 6). The `Threat` entry in `CONTEXT.md` stays as written; implementation status belongs here, not in the glossary.

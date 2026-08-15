# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`; never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file. See `triage-labels.md` for the role strings.
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/`, creating the directory if needed.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## PM-to-EM intake

Product proposals enter through `.scratch/product-backlog/`:

- `map.md` is PM's priority view.
- `issues/<NN>-<slug>.md` is the durable proposal record.
- `Status: needs-triage` means PM is still shaping the proposal or awaiting user approval; it is not authorized implementation work.
- `Status: ready-for-agent` means the user approved a fully specified product outcome. PM hands the orchestrator the issue path.

After a `ready-for-agent` handoff, the orchestrator owns delivery decomposition, sequencing, dependencies, and closure. Preserve the confirmed product outcome; route any proposed outcome change back to PM and the user. Create implementation scope and tickets in a separate `.scratch/<feature>/` directory, leaving the product proposal as the intake record.

When a delivery uses deterministic handoff packets, keep the issue file as the scope and status record and store durable assignment/acknowledgment/completion evidence under `docs/artifacts/handoff-packets/<handoff-id>/`. Proposal 12's approved Phase 0 packet contract uses immutable JSON packet files plus immutable superseding revisions; `docs/artifacts/handoff-packets.md` is the canonical schema and validator authority. Issue comments and task messages may link packet verdicts but are not the packet authority.

For a current packet-root verdict, run the canonical read-only validator from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\debug\validate_handoff_packets.ps1 -Root .\docs\artifacts\handoff-packets
```

The mandatory dependency/closure gate is active. The Coordinator must obtain an exit-`0` current-root result before advancing a packet-dependent issue or recording a milestone closure; an exit-`1` result keeps the item open until valid immutable packet evidence is supplied. The validator itself remains read-only and never edits issue status or routes work automatically.

When a completed delivery needs historical coordination lookup, the live [project coordination ledger](../artifacts/project-coordination.md) remains the first operational surface. Its compact closure summaries may link to append-only [coordination-history](../artifacts/coordination-history/README.md) blocks; do not move non-terminal issue records, current intake, or packet evidence into that archive.

## Wayfinding operations

Used by `/wayfinder`. The map is a file with one child file per ticket.

- Map: `.scratch/<effort>/map.md`, containing the notes, decisions so far, and fog body.
- Child ticket: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`, `prototype`, `grilling`, or `task`); a `Status:` line records `claimed` or `resolved`.
- Blocking: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- Frontier: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- Claim: set `Status: claimed` and save before any work.
- Resolve: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer with gist and link to the map's decisions so far in `map.md`.

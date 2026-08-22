import { scenarioActionSchema } from './content/schemas'
import { resolve } from './resolve'
import type { PlayerCommandInput } from './actions'
import type { ContentCatalog } from './content/catalog'
import type { EncounterState, ResolveResult } from './types'

// The runtime trust boundary (engine-hardening follow-up, issue 04). The
// player/system type split (PR #142) erases at runtime, so before any
// client-controlled payload reaches the engine there has to be one entry
// point that validates the payload's whole shape — not just its `kind` — and
// structurally cannot admit a System Action. The schema authority is the
// Scenario's own `scenarioActionSchema`: the one declared player-command
// vocabulary, already guarded two ways against `PLAYER_COMMAND_KINDS` at
// module load, so the live boundary and the replay seam can never drift.
//
// The division of labour is deliberate: this boundary refuses MALFORMED
// input with no fact recorded — the action never existed, there is nothing
// for the record to say. A well-formed but ILLEGAL command is accepted here
// and refused by `legality()` inside resolution, with the refusal recorded
// as a fact, exactly as if a trusted caller had submitted it. Unknown keys
// are stripped by the parse, so what resolves is the declared shape and
// nothing more. Raw `resolve()` stays the internal, trusted seam; the
// Workbench's system-action debug injection stays off-replay by design.
export type PlayerCommandSubmission =
  | { accepted: true; action: PlayerCommandInput; result: ResolveResult }
  | { accepted: false; reason: string }

export function resolvePlayerCommand(catalog: ContentCatalog, state: EncounterState, payload: unknown): PlayerCommandSubmission {
  const parsed = scenarioActionSchema.safeParse(payload)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.length > 0 ? issue.path.join('.') : '(root)'}: ${issue.message}`)
      .join('; ')
    return { accepted: false, reason: `Not a player command — ${detail}` }
  }
  const action: PlayerCommandInput = parsed.data
  return { accepted: true, action, result: resolve(catalog, state, action) }
}

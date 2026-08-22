import { z } from 'zod'

// The shared authoring primitives every content concept builds on. Kept
// below the concept modules (card, counter, program, encounter…) so the
// `schemas.ts` facade can re-export both layers without an import cycle:
// concepts import primitives, never the other way around.

export const axialSchema = z.object({
  q: z.number().int(),
  r: z.number().int(),
})

// The one authored `when` vocabulary, shared by Counter Readers and
// Signature Grants (ADR 0041). The event registry in `events.ts` is what
// gives each value its moment; a value no registry row hears fails the build
// at module load. D-085 split the takes side: `host_damage_incoming` is the
// modifier moment, read before mitigation, and `host_takes_damage` survives
// meaning only the reaction, read after the blow lands.
export const AUTHORED_WHENS = ['round_start', 'host_damage_incoming', 'host_takes_damage', 'host_deals_damage', 'slot_fired', 'host_entered', 'counter_spent'] as const
export type AuthoredWhen = (typeof AUTHORED_WHENS)[number]

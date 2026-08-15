// Seeded randomness with a per-call audit trail (ADR 0012 carried over per
// ADR 0019). The generator is mulberry32, a well-known 32-bit PRNG; numeric
// parity with the frozen Godot PCG32 is explicitly not a goal.

export interface RngChoice {
  label: string
  minimum: number
  maximum: number
  value: number
}

export interface RngState {
  seed: number
  state: number
  choices: RngChoice[]
}

export function createRng(seed: number): RngState {
  const normalized = seed >>> 0
  return { seed: normalized, state: normalized, choices: [] }
}

function nextUint32(rng: RngState): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0
  let t = rng.state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
  return (t ^ (t >>> 14)) >>> 0
}

export function randiRange(rng: RngState, minimum: number, maximum: number, label = 'random'): number {
  const span = maximum - minimum + 1
  const value = span <= 0 ? minimum : minimum + (nextUint32(rng) % span)
  rng.choices.push({ label, minimum, maximum, value })
  return value
}

// Fisher-Yates, walking top-down exactly like the reference shuffle so the
// audit trail records one choice per swap.
export function shuffle<T>(rng: RngState, values: T[], label = 'shuffle'): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = randiRange(rng, 0, index, label)
    const value = values[index]
    values[index] = values[swapIndex]
    values[swapIndex] = value
  }
}

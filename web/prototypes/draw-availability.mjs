// Draw-availability measurement for the live Elian Voss deck.
//
// Question: on a given Round, how often is a specific answer card simply not
// in hand? This is the quantified form of "we are hoping for the right card at
// the right time" (see docs/content/research/2026-08-19-fixed-hero-powers-and-command-zones.md).
//
// Model: the card economy only -- no board, no Boss, no Slots. Opening hand 4,
// refill-to-4 at Round end, `spend` cards leave hand per Round (charging Slots
// plus Stamina discards), discard reshuffles when the deck runs out. Discards
// are chosen uniformly at random so the measurement neither protects nor
// preferentially burns the rare identities.
//
// Throwaway prototype artifact, kept as the source for the research note's
// table, in the same spirit as draw1-economy-sim.cjs.
//
// Usage (from repo root):  node web/prototypes/draw-availability.mjs

// Mirrors data/encounters/embermaw_prototype.json -> player_deck.
const DECK = [
  ['steady_strike', 6],
  ['iron_guard', 6],
  ['sweeping_blow', 2],
  ['fortify', 2],
  ['shield_slam', 2],
  ['drive_back', 2],
]

const HAND_TARGET = 4
const ROUNDS = 8
const TRIALS = 40000
const SPENDS = [2, 3]
const DROUGHT = 4

// Deterministic PRNG so the published table reproduces exactly.
function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(cards, rng) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

const IDS = DECK.map(([id]) => id)

// One 8-Round run. Returns, per identity, whether it was in hand at each
// Loadout Step -- the moment the player decides what this Round can be.
function run(spend, rng) {
  let deck = shuffle(
    DECK.flatMap(([id, copies]) => Array.from({ length: copies }, () => id)),
    rng,
  )
  let discard = []
  const hand = []

  const draw = (count) => {
    for (let i = 0; i < count; i++) {
      if (deck.length === 0) {
        deck = shuffle(discard, rng)
        discard = []
      }
      if (deck.length === 0) break
      hand.push(deck.pop())
    }
  }

  draw(HAND_TARGET)

  const held = Object.fromEntries(IDS.map((id) => [id, []]))
  for (let round = 0; round < ROUNDS; round++) {
    const inHand = new Set(hand)
    for (const id of IDS) held[id].push(inHand.has(id))
    for (let i = 0; i < spend && hand.length > 0; i++) {
      discard.push(hand.splice(Math.floor(rng() * hand.length), 1)[0])
    }
    draw(Math.max(0, HAND_TARGET - hand.length))
  }
  return held
}

for (const spend of SPENDS) {
  const rng = mulberry32(0x5eed + spend)
  const roundsHeld = Object.fromEntries(IDS.map((id) => [id, 0]))
  const droughtRuns = Object.fromEntries(IDS.map((id) => [id, 0]))

  for (let trial = 0; trial < TRIALS; trial++) {
    const held = run(spend, rng)
    for (const id of IDS) {
      let gap = 0
      let longestGap = 0
      for (const present of held[id]) {
        if (present) {
          roundsHeld[id]++
          gap = 0
        } else if (++gap > longestGap) {
          longestGap = gap
        }
      }
      if (longestGap >= DROUGHT) droughtRuns[id]++
    }
  }

  console.log(`\n=== ${spend} cards spent/Round · ${TRIALS} runs × ${ROUNDS} Rounds ===`)
  console.log('card              copies   in hand at Loadout   runs with a 4+ Round drought')
  for (const [id, copies] of DECK) {
    const available = ((roundsHeld[id] / (TRIALS * ROUNDS)) * 100).toFixed(1)
    const drought = ((droughtRuns[id] / TRIALS) * 100).toFixed(1)
    console.log(
      `${id.padEnd(16)}  ${String(copies).padStart(6)}   ${available.padStart(17)}%   ${drought.padStart(26)}%`,
    )
  }
}

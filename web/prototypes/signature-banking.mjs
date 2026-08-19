// Banking-versus-cashing measurement for the Signature Slot (Riposte).
//
// Question (evaluation gate step 2 of
// docs/content/design-proposals/fixed-hero-power.md): with earned Charges
// banking to `max_charge: 2`, is "fire at one Charge for tempo, or ride to
// the cap for the big hit" a live decision -- or does one line dominate?
//
// Model: the Signature economy only -- no board, no hand, no Health. A Round
// offers an earn opportunity when its program carries the `tank_hit` Beat
// (Raking Claw), which resolves in Boss Instant, BEFORE that Round's Quick
// Window. Program order mirrors ADR 0028: Round 1 pinned to `hunt`, then
// shuffled whole-pool bags with no back-to-back repeat. An offered earn
// converts to a Charge with probability `p` (the player's zero-loss block
// rate -- Armor sized to the hit while holding the Guarded Front), swept as a
// parameter. A trigger while the stack is full earns nothing (overcap waste).
// The Signature may fire once per Quick Window, spending the whole stack.
//
// Policies:
//   cash_at_1    fire every Quick Window the stack is non-empty
//   bank_to_cap  fire only at the cap (cash whatever is left in the last Round)
//   oracle       bank, but cash pre-emptively when full AND next Round's
//                program will offer an earn (perfect schedule foresight --
//                the ceiling of the overcap-avoidance read)
//   predictor    oracle whose forecast is right 66% of the time, the live
//                `programPredictability` number after ADR 0031
//
// Number sets:
//   slam    base 3, +2 per Charge (settled decision 10 -- Shield Slam's own)
//   neutral 0 base, 3 per Charge (rate-neutral candidate: total damage is
//           independent of WHEN you fire, so only overcap waste separates
//           the policies)
//
// Throwaway prototype artifact, kept as the source for the proposal's
// prototype-finding section, in the spirit of draw-availability.mjs.
//
// Usage (from repo root):  node web/prototypes/signature-banking.mjs

const ROUNDS = 8
const TRIALS = 40000
const MAX_CHARGE = 2
const PREDICTABILITY = 0.66

// Phase I pool; `true` = the program's Boss Instant row carries the tank_hit
// (Raking Claw). Mirrors data/boss_programs/*.json.
const POOL = [
  ['hunt', true],
  ['embers', false],
  ['brood', true],
]

const NUMBERS = {
  slam: (charges) => 3 + 2 * charges,
  neutral: (charges) => 3 * charges,
}

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

// ADR 0028's shape: index 0 pinned to hunt, then repeatedly shuffled bags of
// the whole pool with no back-to-back repeat across the seam.
function programSequence(rng) {
  const seq = [POOL[0]]
  while (seq.length < ROUNDS) {
    const bag = [...POOL]
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
    if (bag[0][0] === seq[seq.length - 1][0]) {
      ;[bag[0], bag[1]] = [bag[1], bag[0]]
    }
    seq.push(...bag)
  }
  return seq.slice(0, ROUNDS).map(([, hasTankHit]) => hasTankHit)
}

function runTrial(rng, blockRate, damageOf, policy) {
  const offers = programSequence(rng)
  // Roll every block once so all policies inside a number set could share the
  // same earn stream; here each (policy, set) pair re-rolls, which is fair
  // because the streams are identically distributed and 40k trials average it.
  const earns = offers.map((offered) => offered && rng() < blockRate)

  let charges = 0
  let damage = 0
  let fires = 0
  let wasted = 0

  for (let round = 0; round < ROUNDS; round++) {
    // Boss Instant: the earn moment, before the Quick Window.
    if (earns[round]) {
      if (charges >= MAX_CHARGE) wasted++
      else charges++
    }

    // Quick Window: fire or hold.
    let fire = false
    const lastRound = round === ROUNDS - 1
    if (charges > 0) {
      if (policy === 'cash_at_1') fire = true
      else if (policy === 'bank_to_cap') fire = charges >= MAX_CHARGE || lastRound
      else {
        // oracle / predictor: bank to cap, but cash a full stack when the
        // next Round is believed to offer an earn.
        const nextOffers = !lastRound && offers[round + 1]
        const believed =
          policy === 'oracle'
            ? nextOffers
            : rng() < PREDICTABILITY
              ? nextOffers
              : !nextOffers
        fire = charges >= MAX_CHARGE ? believed || lastRound : lastRound
      }
    }
    if (fire) {
      damage += damageOf(charges)
      fires++
      charges = 0
    }
  }
  return { damage, fires, wasted }
}

const POLICIES = ['cash_at_1', 'bank_to_cap', 'oracle', 'predictor']
const BLOCK_RATES = [0.4, 0.6, 0.8, 1.0]

for (const [setName, damageOf] of Object.entries(NUMBERS)) {
  console.log(`\n=== numbers: ${setName} ===`)
  console.log('block-rate | policy      | damage | fires | wasted earns')
  for (const p of BLOCK_RATES) {
    for (const policy of POLICIES) {
      const rng = mulberry32(0xe11a + Math.round(p * 100))
      let damage = 0
      let fires = 0
      let wasted = 0
      for (let t = 0; t < TRIALS; t++) {
        const r = runTrial(rng, p, damageOf, policy)
        damage += r.damage
        fires += r.fires
        wasted += r.wasted
      }
      console.log(
        `${p.toFixed(1).padStart(10)} | ${policy.padEnd(11)} | ${(damage / TRIALS)
          .toFixed(2)
          .padStart(6)} | ${(fires / TRIALS).toFixed(2).padStart(5)} | ${(wasted / TRIALS).toFixed(2)}`
      )
    }
  }
}

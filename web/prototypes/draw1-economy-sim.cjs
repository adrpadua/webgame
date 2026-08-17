// PROTOTYPE HARNESS — THROWAWAY. Run: node web/prototypes/draw1-economy-sim.cjs
// Headless simulation over the prototype's pure module.
// One fixed heuristic bot, identical across all economies — the comparison is the point.
const fs = require('fs')
const html = fs.readFileSync(require('path').join(__dirname,'draw1-economy-prototype.html'),'utf8')
eval(html.split('/*MODULE-START*/')[1].split('/*MODULE-END*/')[0].replace('const Proto','globalThis.Proto'))

const BURN_ORDER = ['steady_strike','fortify','sweeping_blow','iron_guard','shield_slam'] // cheapest first
const isGuard = id => Proto.CARDS[id].guard

function cheapest(hand, avoid=new Set()){
  for(const id of BURN_ORDER){ if(hand.includes(id) && !avoid.has(id)) return id }
  return hand[0]
}

function act(s, a, m){ const n = Proto.reduce(s, a); if(n!==s) m.actions++; return n }

function playRound(s, m, policy){
  const row = Proto.beatRow(s)
  const claw  = row.incoming.find(b=>b.tank)
  const cone  = row.incoming.find(b=>b.cone)

  // ---- Loadout: slot0 wants Iron Guard; slot1 wants Sweeping (if whelp trouble) > Slam (if riposte lit) > Steady
  const want1 = (s.whelps>=2 && s.hand.includes('sweeping_blow')) ? 'sweeping_blow'
              : (s.hero.riposte && s.hand.includes('shield_slam')) ? 'shield_slam'
              : s.hand.includes('steady_strike') ? 'steady_strike'
              : s.hand.includes('shield_slam') ? 'shield_slam' : null
  if(!s.slots[0].top && s.hand.includes('iron_guard')) s = act(s,{type:'install',card:'iron_guard',slot:0},m)
  if(!s.slots[1].top && want1) s = act(s,{type:'install',card:want1,slot:1},m)
  else if(s.slots[1].top && want1 && s.slots[1].top!==want1 && (want1==='sweeping_blow'||want1==='shield_slam') && s.slots[1].charges.length===0)
    s = act(s,{type:'install',card:want1,slot:1},m)
  s = Proto.reduce(s,{type:'next'}); if(s.outcome) return s   // -> quick (instant resolves)

  // ---- Quick
  // position: dodge policy leaves the front on cone rounds, returns on claw rounds
  if(claw && s.hero.pos==='flank' && s.hand.length>0) s = act(s,{type:'move',card:cheapest(s.hand)},m)
  if(cone && !claw && policy==='dodge' && s.hero.pos==='front' && s.hand.length>0) s = act(s,{type:'move',card:cheapest(s.hand)},m)

  // armor for the incoming claw: fire Iron Guard with enough Guard charges
  if(claw && s.slots[0].top==='iron_guard' && !s.slots[0].activated){
    const need = Math.max(0, claw.tank - 3 - s.slots[0].charges.filter(isGuard).length)
    for(let i=0;i<need;i++){
      const g = s.hand.find(isGuard); if(!g) break
      if(s.slots[0].charges.length>=Proto.CARDS.iron_guard.cap) break
      s = act(s,{type:'tuck',card:g,slot:0},m)
    }
    if(s.slots[0].charges.length===0){ // needs any charge to fire at all
      const filler = s.hand.find(c=>!isGuard(c) && c!=='shield_slam') || s.hand.find(c=>c!=='shield_slam')
      if(filler) s = act(s,{type:'tuck',card:filler,slot:0},m)
    }
    if(s.slots[0].charges.length>0) s = act(s,{type:'fire',slot:0},m)
  }

  // attack slot: tuck spares (keep guard cards if a claw comes within 2 rounds), then fire
  const s1 = () => s.slots[1]
  if(s1().top && Proto.CARDS[s1().top].speed==='quick'){
    const clawSoon = [s.round, s.round+1].some(r => (Proto.SCRIPT[Math.min(r,8)-1]||{incoming:[]}).incoming.some(b=>b.tank))
    while(s1().charges.length < Proto.CARDS[s1().top].cap - 1 && !s1().activated){
      const spare = s.hand.find(c => c!=='shield_slam' && !(clawSoon && isGuard(c)))
      if(!spare) break
      s = act(s,{type:'tuck',card:spare,slot:1},m)
    }
    if(s1().charges.length===0 && s.hand.length>1){
      const filler = s.hand.find(c=>c!=='shield_slam') ; if(filler) s = act(s,{type:'tuck',card:filler,slot:1},m)
    }
    if(!s1().activated && s1().charges.length>0 && (s1().top!=='sweeping_blow' || s.whelps>0))
      s = act(s,{type:'fire',slot:1},m)
  }
  s = Proto.reduce(s,{type:'next'}); if(s.outcome) return s   // -> slow (incoming resolves)

  // ---- Slow: nothing installed slow in this bot; pass
  s = Proto.reduce(s,{type:'next'})                            // -> next round / end
  return s
}

function run(economy, deck, policy, seed){
  let s = Proto.initial({economy, deck, seed})
  const m = { actions:0, emptyQuickWindows:0 }
  while(!s.outcome){
    const handBefore = s.hand.length
    const before = s.round
    s = playRound(s, m, policy)
    if(handBefore===0) m.emptyQuickWindows++
    if(!s.outcome && s.round===before) break // safety
  }
  return { s, m }
}

const SEEDS = 300
const rows = []
for(const economy of ['draw1','draw2','refill3','refill4']){
  for(const deck of ['tiny','full']){
    const agg = { aliveR4:0, finalRound:0, bossDmg:0, victory:0, hpDefeat:0, enrage:0,
                  rEarned:0, rFull:0, rEarly:0, rWasted:0, drawn:0, moved:0, tucked:0, emptyQ:0, endHand:0 }
    for(let seed=1; seed<=SEEDS; seed++){
      const { s, m } = run(economy, deck, 'dodge', seed)
      const c = s.counters
      agg.aliveR4 += (s.checkpoint===true)?1:0
      agg.finalRound += s.round
      agg.bossDmg += c.bossDamage
      agg.victory += s.outcome.startsWith('VICTORY')?1:0
      agg.hpDefeat += s.outcome.startsWith('DEFEAT')?1:0
      agg.enrage += s.outcome.startsWith('ENRAGE')?1:0
      agg.rEarned += c.riposteEarned; agg.rWasted += c.riposteWasted
      agg.rFull += 0; agg.rEarly += 0 // split below via cashed bonus tracking not stored; use cashed only
      agg.drawn += c.drawn; agg.moved += c.movedCards; agg.tucked += c.tucked
      agg.emptyQ += m.emptyQuickWindows; agg.endHand += s.hand.length
      agg.rCashed = (agg.rCashed||0) + c.riposteCashed
    }
    const f = x => (x/SEEDS).toFixed(2)
    rows.push({ economy, deck,
      'aliveR4%': (100*agg.aliveR4/SEEDS).toFixed(0),
      finalRound: f(agg.finalRound),
      'victory%': (100*agg.victory/SEEDS).toFixed(0), 'enrage%': (100*agg.enrage/SEEDS).toFixed(0),
      'hpDeath%': (100*agg.hpDefeat/SEEDS).toFixed(0),
      bossDmg: f(agg.bossDmg),
      ripEarn: f(agg.rEarned), ripCash: f(agg.rCashed||0), ripWaste: f(agg.rWasted),
      drawn: f(agg.drawn), tucked: f(agg.tucked), moved: f(agg.moved),
      starvedRounds: f(agg.emptyQ), endHand: f(agg.endHand),
    })
  }
}
console.table(rows)
console.log(`(${SEEDS} seeds per row; fixed dodge-policy bot; boss has 36 HP; averages per run unless %)`)

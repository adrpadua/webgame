# Research: League of Legends Champion Design Lessons for Hero Design

Date: 2026-08-16
Method: Deep-research workflow — 5 search angles, 23 sources fetched, 20 falsifiable claims extracted, each adversarially verified by a 3-vote skeptic panel (2/3 refutations kill a claim). 19 claims confirmed, 1 refuted, 0 unverified.
Scope: Riot's stated champion design philosophy (2014–2021 primary dev posts) and how it transfers to this game's hero model: role-based heroes expressed through 20-card decks, the charge-stack Action Bar, the visible two-row Boss Timeline, and earned status payoffs such as Riposte Ready.

Verbatim quotes below are from Riot primary sources. "Application" paragraphs are our inference for this game, not Riot's words.

## Executive Summary

Riot's champion design rests on six explicitly named design values — **Mastery, Meaningful Choices, Counterplay, Teamplay, Clarity, Evolution** — with counterplay elevated to formal doctrine: every high-impact threat must leave the defender options, counterplay should scale in proportion to an ability's power, and baseline answers should be universally accessible rather than kit-gated. Champions are conceived cross-disciplinarily (theme and mechanics as one unit, from day one), validated through early evocative prototypes where most of the original kit is expected to churn, and balanced post-launch against four skill audiences with asymmetric thresholds that deliberately permit mastery-gated champions to underperform in average hands.

For this game, the headline transfers are:

1. The two-row Boss Timeline is not a UI convenience — it is the **clarity mechanism that makes counterplay possible**. Guard it as a design pillar.
2. The biggest boss hits should occupy the longest telegraph lead; the biggest hero payoffs (Riposte Ready) should carry the strictest execution requirements. Power and counterplay scale together.
3. Keep move/mitigate answers universal across every hero deck; make class tools (perfect-block, cleanse, reposition) differentiators layered on top, never the only defense.
4. The card-tuck decision (fire now vs. bank as Charge) must never have a dominant line.
5. Tune heroes per skill tier, and let hard, mastery-rewarding heroes be weak for average players as long as they shine when mastered.

## Verified Findings

### 1. Six named design values (high confidence, 3-0)

Morello's May 2014 dev blog "The Design Values of League of Legends" defines six values guiding all champion and game design: **Mastery, Meaningful Choices, Counterplay, Teamplay, Clarity, Evolution** — reinforced by per-value "In-Depth" follow-up posts and never retracted.

Sources: [Riot dev blog (dead URL, mirrored)](https://na.leagueoflegends.com/en/news/game-updates/features/dev-blog-design-values-league-legends), [Surrender@20 mirror](https://www.surrenderat20.net/2014/05/red-post-collection-design-values-of.html)

**Application:** This project's equivalents already exist piecemeal (readable Boss Timeline = Clarity; Slot tension = Meaningful Choices; Riposte = Mastery). Naming them as explicit checklist values in the character design bible would give hero reviews the same shared vocabulary Riot uses — every new hero proposal gets checked against all six, not just the ones the designer happened to think about.

### 2. Counterplay doctrine: fights must stay two-sided (high confidence, 3-0)

Riot's formal definition: counterplay is any "action, choice, or strategy a player can use to mitigate or overcome an enemy threat." From the 2014 blog: "Rich and exciting fights need to be two-sided... A fight loses its excitement if the first punch wins – it's what you can do after that adds depth and complexity. We try to prevent hard counters and abilities with no room for reaction." Restated in May 2021 as "a staple of our design philosophy for many years" — seven years of continuity.

Sources: 2014 dev blog; [Quick Gameplay Thoughts, May 2021](https://www.leagueoflegends.com/en-us/news/dev/quick-gameplay-thoughts-may-14/)

**Application:** Every boss Beat needs at least one player-accessible answer, and the game already encodes this as counter-tags: Cinder Breath answers to Move, Raking Claw answers to Mitigate. The doctrine gives the rule for future boss authoring: a Beat with *no* counter-tag is a design defect, not a difficulty knob.

### 3. Two layers of counterplay: tactical and strategic (high confidence, 3-0)

Riot distinguishes **tactical** counterplay (in-combat, in-the-moment: dodging a skillshot, interrupting a channel, preparing defenses during a windup) from **strategic** counterplay (out-of-combat, often team-level: counter items, composition choices, grouping against an assassin). Strategic counterplay "is accessed out of combat and often by the team."

Source: Quick Gameplay Thoughts, May 2021

**Application:** Tactical maps to in-round card play against the Timeline; strategic maps to deck construction and future party composition. Both layers should be deliberately designed. Today the game is strong on tactical (window-by-window Slot decisions) and thin on strategic — a hook for the future deck-building and party-selection layers: bosses should telegraph their identity *before* the encounter so loadout is a real strategic decision.

### 4. Impact and counterplay should be proportional — the Ashe R pattern (high confidence, 3-0)

"Impact and counterplay should often be proportional: Stronger effects benefit from more counterplay." Tactical counterplay is "essential" for near-guaranteed-kill moments (Blitzcrank hook, Ashe R, Sion Q). Ashe R is the canonical template of power and counterplay scaling together *inside one ability*: "spells like Ashe R do both at once with an increasing stun duration as the spell moves further and gives opponents more time to dodge." Riot's own caution: not every spell needs tactical counterplay — too much makes a kit clunky. Proportionality, not universality, is the rule.

Source: Quick Gameplay Thoughts, May 2021

**Application:** Two direct transfers. Boss side: the hardest-hitting abilities should sit in the Incoming Row (a full extra round of warning), while chip damage may resolve as Instants — Embermaw already roughly does this; make it a stated authoring rule with damage tiers mapped to telegraph lead. Hero side: Riposte Ready **is** an Ashe R — the payoff (+2 Boss damage) is gated on the strictest execution in the kit (zero-Health-loss Tank Hit while holding the Guarded Front). Future hero payoffs should copy this shape: bigger reward, bigger and riskier commitment window.

### 5. Baseline answers should be universal, not kit-gated (high confidence, 3-0)

"In most cases it's best to make sure that tactical gameplay is universally accessible (versus being tied to a specific champ ability like a dash or immunity) so that all opponents have the opportunity to respond to this impactful spell." (The "in most cases" hedge is Riot's own.)

Source: Quick Gameplay Thoughts, May 2021

**Application:** The card-discard move is exactly this — a universal answer every hero has regardless of deck contents. Protect it: future Healer and DPS decks must keep the discard-to-move gesture and some baseline mitigation reachable, with class-specific answers (Elian's perfect-block, a Healer's cleanse, a DPS's reposition) layered on top as differentiators. A boss mechanic that only one class can answer should be a deliberate role-targeting choice, never an accident of deck composition.

### 6. Meaningful choice requires real tradeoffs; no dominant line (high confidence, 3-0)

"A meaningful choice requires tradeoffs. If it's a no-brainer, it's not interesting. If nobody understands the consequences of their decision, it's not engaging." And on build diversity: "Instead of offering a best path forward, we want to offer different paths forward that have real tradeoffs."

Source: 2014 dev blog; reaffirmed in Riot's URF Academy curriculum and the 2016 "In-Depth with Meaningful Choices" follow-up

**Application:** This is the standing test for the Action Bar: firing a card versus tucking it as Charge must never have a dominant answer. The existing deck-evaluation rubric's "always-Shield-Slam line" check is this principle operationalized — extend the same "no dominant line" check to every new hero's kit at evaluation time, per class.

### 7. Clarity exists so both sides can make informed decisions (high confidence, 3-0)

"The job of clarity is to refine knowledge such that both parties can make intelligent choices." Clarity is one of the six named design values and is the stated rationale behind visible telegraphs.

Source: 2014 design-values dev blog series

**Application:** The two-row Boss Timeline is this game's clarity mechanism — it is what makes every counterplay window exist. Treat Timeline readability as a hard constraint on boss authoring: an ability whose danger cannot be read from the Timeline plus board state is not "hard," it is unclear, and Riot's framework treats that as a defect. This also validates the tutorial-prompt policy of explaining existing facts rather than adding hidden rules.

### 8. Four-audience balance framework with per-tier thresholds (high confidence, 3-0)

Riot's May 2019 Champion Balance Framework defines four player audiences — Average play (below top 10%), Skilled (top 10% of solo queue excluding the top), Elite (top 0.1%, widened to top 0.5% in 2020), Professional — each with its own numeric overpowered/underpowered definition; higher-skill tiers are held to stricter thresholds. For Average play, the OP threshold slides with frustration: 54.5% win rate at below-average ban rates tightening to 52.5% at 5× average ban rate — perceived frustration lowers the tolerated statistical power.

Source: [/dev: Champion Balance Framework, 2019](https://www.leagueoflegends.com/en-us/news/dev/dev-champion-balance-framework/); revised numbers in the 2020 update

**Application:** For this game the transferable idea is the *structure*, not the numbers: define hero performance targets per player-skill tier (first-encounter players vs. practiced players vs. optimizers), measure them separately in deck evaluations, and treat player frustration signals as a balance input alongside raw clear/survival rates. The existing solo-Tank "end-of-Round-4 checkpoint" is already a tier-scoped target; the framework says to make one per audience, per hero.

### 9. Asymmetric buff/nerf thresholds legitimize skill-gated heroes (high confidence, 3-0)

A champion is nerfed when overpowered for **any** audience but buffed only when underpowered for **all** four: "A champion should perform well in at least one area of play, which is why the buff threshold is declared as 'underpowered in all four audiences.'" This deliberately permits skill-gated champions (the Azir/Ryze pattern) that are weak for average players but strong when mastered. Caveat: in practice Riot also ships compensation buffs during reworks outside the framework — a guideline, not a hard rule.

Source: /dev: Champion Balance Framework, 2019; reaffirmed 2020

**Application:** The roster can legitimately include hard, mastery-rewarding heroes whose average-player performance is low, as long as they shine for invested players. Resist "fixing" a hero into pub-stomping accessibility just because new players lose with it — Elian's riposte loop appearing in only 1 of 3 evaluation seeds may be correct tuning, not a problem.

### 10. Mastery investment is never punished by balance (high confidence, 3-0)

Riot is "intentionally leaving out mastery curve data... because they don't want to enact a system that might punish the investments players make into mastering a champion," relying instead on mastered over-power surfacing as high Pro presence or Elite bans.

Source: /dev: Champion Balance Framework, 2019; not reversed by the 2020 update

**Application:** Don't nerf a hero because veterans over-perform with it — veteran over-performance is the reward the design promises. Intervene only when mastered power distorts the top-end (e.g., an optimized line that trivializes an encounter for everyone who reads a guide).

### 11. Theme and mechanics are conceived as one unit, cross-disciplinarily (high confidence, 3-0)

Every Riot champion begins with a cross-disciplinary "core concept" phase — at minimum an artist, writer, and gameplay designer jointly define the gameplay niche, unique visual appearance, personality, and place in the world *before* kit work proceeds. Corroborated by later Riot D/N/A (Design, Narrative, Art) materials (Bel'Veth 2022, Hwei 2023), showing the practice persisted.

Source: [/dev: On Champion Prototypes, 2016](https://nexus.leagueoflegends.com/en-us/2016/10/dev-on-champion-prototypes/)

**Application:** Elian already follows this — the Redwater Locks story, the Gate Rig visual language, and the Hold/Brace/Riposte mechanical verbs were designed as one identity, and the deck reads as "practiced civic defense turned into raid technique." Codify that as the required starting point for every future hero: niche + fantasy + visual language defined together in the hero design doc *before* any card list exists.

### 12. Early playable prototypes; the initial kit is a hypothesis (high confidence, 3-0)

"Get the character in game as soon as possible to start testing... abilities, goals for strengths and weaknesses... testing with a lot of trial and error is really important." And: "Occasionally, abilities from the original concept... stay on their kit throughout development. More often though, a champion will go through dozens of abilities (or at least variations)."

Sources: /dev: On Champion Prototypes, 2016; [Riot R&D: Prototype](https://www.riotgames.com/en/r-and-d-office/prototype-building-a-games-substance)

**Application:** State each hero's target strengths/weaknesses up front (Elian's design doc does this; keep the pattern), playtest decks against real boss timelines early via the existing deterministic-seed evaluation harness, and budget for most of a 20-card list to change between concept and ship. The initial kit is a hypothesis, not a spec — which the repo's own history already demonstrates (10/10 baseline → five-identity Shield Wall kit).

### 13. Prototypes must be evocative — theme failure is testable (high confidence, 3-0)

Even rough prototypes "should be evocative, capturing at least some of the feeling of the champion being made, as this results in better playtest feedback" (Lulu whimsical, Zed intimidating, Braum friendly). The Kled case: a placeholder that "hit its clarity goals [but] felt really flat in terms of personality" until a Gnar model was bound riding atop the mount — "feedback and excitement for Kled improved dramatically once we got that revised placeholder model in." Thematic-mechanical cohesion is testable in playtests, not an aesthetic afterthought. (Riot reports the improvement qualitatively, not as quantified metrics.)

Source: /dev: On Champion Prototypes, 2016

**Application:** Even placeholder hero content should communicate the fantasy — a shared Paladin placeholder card art across all cards (the current state) is exactly the Kled trap. Add a playtest scorecard question per hero: "Can the player articulate this hero's fantasy in one sentence?" If not, treat it as a failed test regardless of mechanical soundness.

## Refuted Claim — do not cite

- "In Pro play a champion is automatically deemed overpowered at 90%+ pick/ban presence in the current patch or 80%+ across consecutive patches" — **refuted 0-3** by the verification panel despite appearing in secondary coverage. Riot does use presence-style metrics at top tiers, but these specific numeric triggers are not supported by the primary source.

## Caveats

- Nearly all primary Riot URLs (2014 design values, 2016 prototypes post) are dead or egress-blocked; verification relied on convergent mirrors (Surrender@20, MOBAFire, devtrackers) and search-index snippets. Quotes are high-confidence verbatim, but future citations should point at archived copies.
- Material spans 2014–2021 and describes Riot's *stated historical* philosophy. Balance-framework numbers were revised in 2020 and no post-2021 primary statement was verified — treat numeric thresholds as illustrative of the method, not current values.
- Community critiques of Riot target execution, not the philosophy; the claims here are about the philosophy.
- All "Application" paragraphs are our inference for this project, clearly separated from Riot's statements.
- Notably absent from surviving evidence (searched, but sources failed fetch or quality checks): Riot's 2016 class/subclass taxonomy (Vanguard/Warden, Juggernaut/Diver, etc.), explicit "power budget" terminology, and a literal champion-design checklist. These parts of the question are answered only indirectly.

## Open Questions

1. Has the four-audience framework or the design-values vocabulary been superseded post-2021?
2. How does Riot formally operationalize "power budgets" and the class/subclass system? The 2016 subclass taxonomy (e.g., Vanguard vs. Warden tanks) is the piece that maps most directly onto role-based hero classes here and its primary source did not survive fetching — worth a targeted follow-up (archive.org) before designing the second tank.
3. Does Riot use concrete numeric heuristics for telegraph/windup time versus payoff size? That would directly inform how many Timeline rows of lead each boss-damage tier should get.
4. Is there an explicit rubric for the uniqueness-vs-accessibility tradeoff per champion at concept stage (target mastery-curve shape, intended audience size) transferable to deciding how hard each hero's deck should be?

## Suggested Next Steps (not yet actioned)

1. Add the six design values as a named checklist section in `docs/rules/character-design-bible.md` for hero reviews.
2. Add a boss-authoring rule to the encounter design docs: damage tier maps to telegraph lead (Instant < Incoming < multi-round), and every Beat must carry at least one counter-tag.
3. Add the "articulate the fantasy in one sentence" question to the playtest scorecard in `docs/content/heroes/elian-voss-design.md`.
4. Archive-fetch the 2016 Classes & Subclasses dev blog before starting the second hero, to close the taxonomy gap above.

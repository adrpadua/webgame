# Research: Support/Healer Design Lessons for Hero Design

Date: 2026-08-17
Method: Deep-research workflow — 5 search angles, 20 sources fetched, adversarial 3-vote verification per claim (5 confirmed, 0 refuted) — plus a supplementary search-snippet pass for the strands whose sources were egress-blocked at fetch time (all Overwatch, Marvel Rivals, and proactive-healing-mechanics sources; the extractors correctly returned zero claims rather than guessing).
Scope: What makes players love or refuse the support/healer role in Overwatch, Marvel Rivals, and FFXIV, and how those lessons transfer to a healer hero in this game: 20-card decks, charge-stack Action Bar, round-clearing Armor, a visible two-row telegraphed Boss Timeline, and the Enchanter/Catcher healer split recorded in the [champion design research note](2026-08-16-lol-champion-design-lessons.md).

Confidence is labeled per section. Part 1 survived the adversarial panel; Part 2 is assembled from convergent search-index snippets and secondary coverage and should be re-verified against archived primary copies before any decision hinges on exact wording. "Application" content is our inference, not any studio's statement.

## Executive Summary

The strongest verified evidence is a negative case study: FFXIV's June 2024 `#FFXIVHEALERSTRIKE`, the clearest documented instance of players collectively refusing a role over design neglect. Its grievance list is a ready-made checklist of healer failure modes: boring kits, homogenized jobs, healing utility leaked into other roles until a dedicated healer became literally optional, and a "green DPS" fallback of one-to-two-button damage spam. The supplementary strands supply the positive mirror: Marvel Rivals made its support role genuinely popular by making Strategists half-healer half-threat — real damage, buffs, and game-swinging ultimates — and when Rivals *did* have a "Strategist strike," it was about social blame and being hunted, not boring kits, which NetEase answered with damage buffs ("elevate their threat levels") plus anti-harassment moderation. WoW's Discipline Priest demonstrates the proactive-healing grammar this game's visible timeline is built for: pre-apply, then convert damage into healing — a planning puzzle, not whack-a-mole. FFXIV's Sage carries the counter-warning: a damage-to-healing link that is passive and non-scaling becomes wallpaper.

For this game: the telegraphed Timeline makes the Enchanter naturally proactive (play *ahead* of the damage window), round-clearing Armor makes pre-shielding a fresh puzzle every round, the co-op-versus-boss format and windowed turns structurally remove the real-time stress and PvP blame dynamics, and the healer must be load-bearing — some authored boss pressure should be answerable only by the healer's kit, with tank self-sustain budgeted so it never replaces her.

## Part 1: Verified Findings (adversarial panel, all 3-0)

### 1. Sustained design neglect can turn role-avoidance into organized refusal (high confidence)

On June 9, 2024, Square Enix forum user Gemina (a Scholar main) opened the `#FFXIVHEALERSTRIKE` thread "as a collective voice to the dev team to express the dissatisfaction with the continued direction the game has gone concerning healer gameplay," timed to Dawntrail's July 2 launch; press coverage recorded 300+ pages of supportive comments. Role-avoidance is not only individual preference — it can crystallize into collective refusal when a role's design decays.

Sources: [Kotaku](https://kotaku.com/final-fantasy-14-healer-strike-dawntrail-mmo-rpg-1851543904), [primary thread](https://forum.square-enix.com/ffxiv/threads/499613-FFXIVHEALERSTRIKE); cross-corroborated by PC Gamer, TheGamer, Push Square.

### 2. The strikers' grievances are a failure-mode checklist (high confidence)

The manifesto names four: (1) oversimplification of the healer rotation, (2) too many healing tools given to non-healer jobs, (3) homogenization of the healer jobs relative to each other, and (4) "lack of threat level in nearly all forms of content." Together they produce the "green DPS" limbo: content rarely demands active healing, so healers mostly deal damage — but the damage fallback is one-to-two-button spam. Two protection duties follow: protect healer identity *from other healers* (differentiation) and *from other roles* (utility leakage), and make whatever the healer does in downtime an engaging sub-game in its own right.

### 3. The terminal state of utility leakage: the no-healer clear (high confidence)

The strike's catalyzing moment: a preview party cleared Dawntrail's first dungeon with no healer — a self-sustaining Warrior tank plus a Red Mage's off-role healing and revival made the dedicated healer redundant. When off-role sustain can fully cover content, the healer's reason to exist evaporates. ("Tipping point" is editorial framing; the grievances long predated the video.)

## Part 2: Supplementary Findings (medium confidence, snippet-sourced)

### 4. Overwatch: the chronic support shortage and "highest adjustment priority"

Blizzard has repeatedly acknowledged the support role as underpopulated and underpowered in agency terms: "We know support players want additional tools and power to be more impactful in Overwatch 2, and the role remains our highest adjustment priority" (OW2 beta developer update), with role-queue data showing Tank/Damage "relatively more popular vs. the Support role." Season 9's controversial fix extended a tuned-down version of the support self-heal passive to every role, explicitly "to take some of the pressure off Support players" — a design admission that responsibility asymmetry, not just kit power, drives the shortage. Sources: [TechRadar](https://www.techradar.com/news/playing-support-in-overwatch-2-feels-bad-blizzard-promises-to-make-it-better), [GamesRadar](https://www.gamesradar.com/blizzard-wants-to-make-overwatch-2-support-more-popular-to-reduce-long-queues/), [Kotaku on Season 9](https://kotaku.com/overwatch-2-season-9-self-healing-passive-tank-damage-1851163814), [Turtle Beach explainer](https://www.turtlebeach.com/blog/overwatch-2-season-9-self-healing-explained-how-it-works-and-more).

### 5. Marvel Rivals: the positive counter-example — supports as threats

Strategists are "not simply full healer characters": healing is roughly half the kit, alongside real damage, buffs, resurrections, and battlefield-swinging ultimates (Luna Snow's ultimate toggles between AoE healing and a damage buff; Mantis speeds and amplifies her team). The role is widely described as the most impactful in the meta rather than the least. When Rivals nonetheless had its own "Strategist strike" (February 2025), the grievances were *social and positional*, not kit boredom: dive heroes hunting supports, and teammate blame culture (a streamer calling Strategist mains "morons" sparked it). NetEase's response paired mechanical and social fixes: buffing certain Strategists' damage "to elevate their threat levels" and strengthening harassment reporting. Lesson: a mechanically excellent support role still fails if the role is the party's designated blame-sink or easiest target. Sources: [Mobalytics roles guide](https://mobalytics.gg/marvel-rivals/guides/roles-explained), [GameSpot Strategist tier list](https://www.gamespot.com/gallery/marvel-rivals-best-strategists-support-heroes/2900-6102/), [CBR on the NetEase response](https://www.cbr.com/marvel-rivals-netease-strategist-strike-response/), [Esports Insider](https://esportsinsider.com/marvel-rivals-strategist-players-on-strike), [Aftermath](https://aftermath.site/marvel-rivals-healer-strike/).

### 6. The proactive-healing grammar: Discipline Priest, and the Sage warning

WoW's Discipline Priest is the canonical proactive healer: pre-apply Atonement to allies (via shields like Power Word: Shield), then heal them by dealing damage (Penance, Smite). The identity is "preventing damage before it lands, rather than racing to top health bars after hits arrive" — healing as a ramp-and-convert planning puzzle keyed to known incoming damage. FFXIV's Sage attempts a similar damage-to-healing link (Kardia: each offensive spell heals the linked ally) but the heal is flat and non-scaling, and community assessment treats it as "just a rolling HoT while you're dealing damage" — the link is passive wallpaper rather than a decision. Lesson: damage-to-healing conversion is the strongest known answer to the green-DPS limbo, *if* the conversion involves real choices (who carries the bond, when to ramp, what to convert) and scales with commitment. Sources: [Icy Veins Discipline guide](https://www.icy-veins.com/wow/discipline-priest-pve-healing-guide), [Method guide](https://www.method.gg/guides/discipline-priest), [Icy Veins Sage guide](https://www.icy-veins.com/ffxiv/sage-pve-healing-rotation-ability-priority), [The Balance Sage guides](https://www.thebalanceffxiv.com/jobs/healers/sage/).

### 7. Partial remedy signals from FFXIV's patch cycle

No verified direct Square Enix response to the strike was found, but patch 7.3 shipped a role-separated dungeon in which healers get role-specific combat tasks (e.g., cleansing debuffs) — content authored so the healer's kit is uniquely demanded, which is precisely grievance (4) inverted. Treat as suggestive, not confirmed remedy evidence. Source: [GamesRadar on 7.3](https://www.gamesradar.com/games/final-fantasy/final-fantasy-14-director-yoshi-p-knows-the-mmo-isnt-in-perfect-shape-after-dawntrail-but-patch-7-3-marks-a-new-beginning-for-square-enix/).

## Synthesis: Five Transferable Principles

1. **Be load-bearing or be optional.** Author boss pressure that only the healer's kit answers well, and budget every other role's self-sustain against the no-healer-clear test: off-role sustain may *reduce* the healer's load, never *replace* it. (FFXIV grievances 2 and 4; the Ihuykatumu clear.)
2. **Half the kit is not healing.** The popular support role is a threat that also heals — damage, buffs, and a game-swinging payoff — not a health-bar janitor. When in doubt, NetEase's fix was to raise support *threat*, not support healing. (Rivals; OW "more impactful" priority.)
3. **Make the damage sub-game convert.** The strongest anti-green-DPS design ties the healer's damage to their healing through pre-placed, decision-rich, scaling conversion — the Atonement grammar, not the Kardia grammar. (Disc Priest; Sage warning.)
4. **Proactive is a puzzle; reactive is a treadmill.** Healing keyed to known future damage (pre-shield, ramp, position) creates planning gameplay; healing keyed to surprise damage creates whack-a-mole stress. A fully telegraphed timeline is the ideal substrate for the former. (Disc Priest; FFXIV planned-mitigation culture; open question 4 of the workflow.)
5. **Design against the blame-sink.** Role stress is social as much as mechanical: shared responsibility for survival, visible credit for prevention, and structural protection from being the easiest target all matter. (OW Season 9 rationale; Rivals strike; FFXIV strike rhetoric.)

## Application to This Game's Enchanter Healer

All researcher inference, mapped to existing systems:

- **The Timeline is the healer's home screen.** The Incoming Row telegraphs damage a full window ahead — the Enchanter's core verb should be *covering a named future window*, not repairing a past one. This is the Disc Priest grammar with better information: proactive by construction, whack-a-mole structurally impossible in windowed turns.
- **Round-clearing Armor is the triage clock.** Ally pre-shields that clear at Round start (like all Armor) force a fresh who-gets-covered decision every Round and prevent banking a solved state — decision density renewed by rule, answering grievance (1).
- **Signature mechanic candidate: the Bond (Atonement-shaped).** Pre-place a ward on one ally; the Enchanter's boss-damage cards convert (scaled, not flat) into healing/armor through the ward. Her damage sub-game then *is* her healing engine — one machine, no green-DPS limbo — and "who carries the Bond" is the standing triage decision. Charge Stacks fit naturally: charge the ward Slot to widen or strengthen the conversion.
- **Keep ally-sustain healer-exclusive.** Elian's Armor is self-only and `Rallying Cry` heals 2 (self, solo slice) — hold that line when the Party exists. The no-healer-clear test becomes an authored-content rule: some Beats (raid-wide pressure, damage-over-time, or hits sized beyond tank mitigation) carry counter tags only healer kits execute.
- **She cannot cover everything.** Size her per-Round output below the Boss's total telegraphed pressure so triage — which window, which ally — is a real choice, echoing the impact-proportionality rule already in the boss-authoring doc: the biggest heals should have the strictest setup (Bond placed early, charges committed).
- **Blame-proofing is mostly free here, so keep it.** Co-op versus a boss, no real-time execution, and Encounter Records that already log prevented damage: surface "damage prevented / windows covered" as the healer's visible scoreboard, the way `controlled-a` surfaced Elian's earned Riposte.
- **Differentiation duty (grievance 3):** the Enchanter (augment/shield through Bonds) and the future Catcher-style controller (zones, denial, lockdown) must not converge; the Second Hero Of A Role rule in the character design bible applies to healers from day one.

## Caveats

- Part 1 rests on one well-corroborated strand (the FFXIV strike) largely via Kotaku's account; the primary forum thread's existence was confirmed, but direct fetches of primaries were egress-blocked. "300 pages" is press characterization and some community voices argued the movement's size was overstated.
- Part 2 was never adversarially verified: all Overwatch, Rivals, and healing-mechanics sources were egress-blocked in the workflow's fetch phase, so those findings come from convergent search snippets across multiple independent outlets. Re-verify quotes against archived primaries (especially the two Blizzard developer blogs) before quoting them in anything outward-facing.
- Time-sensitivity: FFXIV facts are June-July 2024 and the Dawntrail patch cycle has continued; Rivals facts are early-to-mid 2025; OW Season 9 is early 2024. Current-state claims in any of these games need fresh checks.
- The workflow's verified set documents failure modes; the "what fixed it" side (open question 1) remains only partially answered by the 7.3 signal above.

## Suggested Next Steps

1. Draft the Enchanter healer hero design doc against the character design bible's full contract (including Signature weakness and the Design Value Review), using the Bond mechanic and Timeline-window triage as the core machine — parallel to `kessa-varn-design.md`.
2. Add the "no-healer-clear test" to boss-authoring guidance when Party-scale encounter design begins: every encounter names which Beats are healer-load-bearing.
3. Archive-fetch the two Blizzard developer blogs ("Designing Heroes" and the support AMA) to upgrade Part 2's Overwatch claims before any of them drive a design decision.

# Party Frame Layout Direction

Status: direction chosen from the design-canvas mockups (2026-08-20). Direction **1A — left-edge overlay** is the accepted layout; 1B (left sidebar) was priced and rejected in the canvas itself. The first implementation pass is in `web/src/ui/party/` and this document records what the mockups decided, so the canvas is not the only copy.

## Two directions, one frame anatomy

The ally frame is the primary Hero's frame with the console removed: same vertical stack, same currency, no piles and no Signature button — **a readout, not a console**.

**1A — left-edge overlay (accepted).** The party column floats over board pixels at the bottom-left, growing upward from the primary frame, 138pt wide against the primary's 208pt — the ragged right edge *is* the hierarchy. The board keeps 100% of its width: 8 hex columns at 44pt, which is the tap floor exactly.

**1B — left sidebar (rejected).** A reserved 112pt column drops the board from 390 to 278pt: 5 hex columns at the tap floor, one flanking column per side of a 3-hex Boss — melee cannot circle and flanking stops being a decision. Board share falls to ~71%. What it bought (no overlap, room to grow) did not cover what it cost.

## The 40/44 rule

Every frame is **40pt tall in every state**, because a readout owes no tap target. In the moment a legal ally action exists, that frame's **hit box alone grows to 44pt and the frame is the button** — no row appears, nothing on screen moves. At most one action is legal per frame at a time, so the four-interactive-rows problem never arises.

The 40pt floor is now stated in the layout (`min-h-10`) rather than left to whatever rows a state happens to render. It had already drifted: a Downed frame drops the Signature bank and stood at 34pt, and the tuck — which drops the bank on every frame — would have made that the normal case. A column whose plates change height when it narrows reads as a different object rather than the same one holding less.

Two doors, one action: the **hex** stays the target of record for anything spatial; the **frame** is the target of record for anything personal — this ally, wherever they are. The frame door is safe because a hex holds one body, so the frame can never be ambiguous about who is meant.

## State vocabulary (canvas 1c)

Healthy · Hurt-with-Armor · Holding Threat · Downed · Downed-nearly-gone · Downed-I-am-adjacent · Ally-card targeting · AI Hero · Revived.

## Material assignments

| Material | Carries |
| --- | --- |
| Signal cloth | The Role channel: Tank 500, Healer 300, Damage 400 (two Damage share a step; they are one Role). Holds the glyph always and the accent only at rest — the accent is the status channel, and **status outranks Role**. |
| Ember | Health, because health is what damage eats. And the revive clock. |
| Runeglass | Armor riding the health bar, and a valid card target. |
| Living gold | The class resource; Revive, the one thing the player operates here; and the **next-up** pip — all three are "there is a press here for you", which is why gold marks the one seat the rail is pointing at and never the others. |
| Ember coral | The Threat mark. It names the Boss's attention, not the Hero. |
| Oathsteel | The ally plate face, dim where the primary's is lit ceramic. |

## The frame is also the switch (the character-switching pass)

Single-player control arrived after the mockups and completes the frame's gesture story: **a tap on a resting ally frame takes control of that Hero** — the whole console (Hand, Action Bar, Hero Frame, board drag) swaps to the pilot, the displaced Hero joins the column, and the camera stays put. The revivable frame keeps its rescue tap: the one legal ally action still outranks the switch, which preserves the 40/44 rule's promise that a frame's grown state means exactly one thing.

The pattern is BG3's portrait click on Spirit Island's structure, per the [party-switching research note](research/2026-08-21-single-player-party-switching-bg3-spirit-island.md): switching drops in-flight gestures and keeps commitments, and the cursor survives undo because the window — not the character — is the commit boundary.

### The tuck (D-107)

The mockup drew a **tab above the column** and the first implementation pass dropped it — not deferred with a reason, simply gone, and absent from this document's own "not wired yet" list as well as from the code. This restores it.

A press on the tab **narrows the column from 138pt to 66pt** over 220ms, and the tab narrows with it from 72pt to 30pt, taking its own `PARTY` label along so the whole object gets out of the way together rather than leaving a labelled stub. The chevron turns 180°. The board gets the pixels back; the party stays on screen.

**What a tucked frame keeps** is everything it can say without words: the Role glyph, the health and Armor bar, the Downed track, and the accent. **What it drops** is everything the accent is already saying at that width — the Threat wedge, because the accent is coral for the Boss's attention whether or not the wedge is drawn — or that needs room to be read: the name, the health number, the Signature bank.

| The mechanism | |
| --- | --- |
| Where it lives | `partyTucked` on the interaction slice, beside the control cursor and for the same reason: it is the player saying how much board they want back, not a gesture they are partway through. Deliberately **not** in `CLEARED_INTERACTION` — a phase advance runs that clear several times a Round, and a column that re-opened itself each time would be arguing with the player. |
| The tap rule | One function, `allyTap` — **expand, then revive, then switch**. |
| The tab's target | The plate is 20pt tall, which no tap rule would allow, so it carries an invisible 52×44 extension upward into board pixels. That is the 40/44 rule's own escape: grow the hit box, never the drawn plate. |
| Motion | 220ms `cubic-bezier(0.2, 0.7, 0.3, 1)`, and not the swap's 300ms — a tuck answers a press on the thing that moves, so it owes the immediacy of direct manipulation rather than the legibility of a handover the player did not touch. A CSS transition rather than a Web Animations flight, which is why this is the one motion here that `index.css`'s freeze block reaches on its own. |

**A tucked column swallows the rescue tap**, which is the part worth arguing about. It looks wrong beside the 40/44 rule — the rescue is meant to be the one thing a grown frame can mean — until you look at what a tucked frame is showing: 66pt of Role glyph, a striped track and an ember accent, with `REVIVE · 1 CARD` among the things the tuck dropped. A press that spent the player's card on a rescue they were never offered would be the interface acting on information it had just hidden. The first press gives the words back and the second spends the card: one extra tap, on a state the player themselves asked to stop looking at.

**Two deliberate departures from the mockup.**

- **The unacted pip survives the tuck**, which the mockup did not draw because the pip postdates it. The mockup's rule for dropping a glyph is that the accent still carries it; the accent carries no unacted channel at all, so dropping the pip would not compress that state, it would delete it — and re-open the silence D-093 exists to close, in the one arrangement where the player has explicitly stopped watching the column.
- **The label is 9pt, not the mockup's 8.** The type ramp has seven steps (D-067) and 8 is not one of them. The ramp outranks the mockup on a value the mockup had no reason to pick deliberately.

**The compression is visual only.** Every frame's `aria-label` says the same sentence tucked or open — same Hero, same health, same window owed — and only its last clause changes, because what the press does is the one thing the tuck really altered. A tuck is the player buying board pixels back, and a screen reader is not spending any.

### The swap is a move, not a cut (D-099)

The first pass swapped the whole console's contents in one video frame. Every readout was correct the instant the store wrote it, and that was the problem: the 208pt plate and the 138pt plate were simply holding different Heroes now, and nothing said the object the player had been reading had *moved*. On a portrait-click switch that sentence is the whole confirmation of the gesture.

The handover is therefore drawn in two motions, because the two halves of the console are different kinds of thing.

**The frames travel.** The tapped frame flies from its slot in the column into the primary box and grows 138 → 208; the displaced Hero's frame flies the other way and shrinks into the column. It is the layout's own claim — the ragged right edge *is* the hierarchy — said in the one channel a still frame cannot use.

| The mechanism | |
| --- | --- |
| Where it lives | `web/src/ui/party/controlSwap.ts`, bound by both frame kinds through one `useSwapFlip` hook. |
| Measure | FLIP's First runs in the **press handler**, not the effect: React batches the store write, so that is the last moment the old layout is still on screen. Both call sites that change the pilot — the frame tap and the rail's unacted press — measure the same way. |
| Claim | Each frame asks *where was I standing before this press?* **by Hero id, never by seat.** That one question serves the promoted frame, the demoted frame, and — in a party of more than two — an untouched ally whose slot index shifted because the column dropped a different name. A box is handed out once and then gone, so no later render can animate from pixels that no longer exist. |
| Curve | 300ms on `cubic-bezier(0.4, 0, 0.2, 1)`, the standard position-and-size curve. Deliberately **not** `wb-beat-deal`'s, the only other motion that moves a whole plate: that one spends 45% of its travel in the first 11% of its duration because a dealt card is an arrival, whereas here the travel *is* the message. |
| Crossing | The Hero Frame's layer sits one step above the column (`z-31`) so the plate the player tapped stays visible where the two pass through each other. At rest the two never share a pixel, so the step costs nothing anywhere else. |

**The console is re-dealt.** The Action Bar and the Hand cannot travel: the arriving Hero's Slots hold different Top Cards and their Hand is a different set of cards, so there is nothing to fly *from*. Every plate whose owner the press changed therefore arrives in turn instead — the Action Bar first and the Hand behind it, down the console and left to right, the reading order the Hand's own offer already uses. The frames say **who** has the console; the deal says **what they brought**, and the two run as one cascade rather than as two announcements.

| The mechanism | |
| --- | --- |
| Where it lives | The same module's `useConsoleDeal`, bound once per row — by `ActionBar` and by `Hand`, never by a Slot or a Compact Card. |
| Why the row, not the plate | A plate cannot tell a handover from its own arrival: a Compact Card mounts every time the Hero draws one, so an effect on the card would re-deal the Hand at every refill. The row outlives both Heroes, so it is the one element that can hold the question *did the pilot change?* and answer it. The plates are read back off the DOM, which also keeps `CompactCard` and `Slot` unaware they are in an animation at all. |
| Shape | 200ms per plate on the same curve; Slots at 0 and 45ms, cards from 60ms at 28ms apiece, and **no plate starts later than 200ms** however many the row grows to hold. A plate waits at 15% opacity rather than at zero — a row held invisible through its delay shows a hole, and a hole is the one thing a row read at a glance cannot afford. |
| Not the rails | Undo and the forward rail belong to the session rather than to any Hero. Nothing about them changed hands, and a row where everything moves says nothing about what actually did. |

Motion that carries state, fired once — the house rule, and this is as bounded as motion gets: it ends when the console has arrived.

**`prefers-reduced-motion` is honoured in JavaScript here**, which is the one place on the surface that is true. `index.css`'s freeze block reaches CSS animations and transitions; a Web Animations flight is neither, and would sail straight through it. Both motions are skipped outright rather than shortened, and the swap is then exactly what it was before this pass — instant, correct, and readable.

## The unacted nudge (D-093)

Multi-character play added a failure the solo slice could not have: a seat you are not piloting can sit out a whole window in silence. Total War's campaign map is the tested answer — the end-turn button becomes "a unit has not moved", each press jumps to one, and it reverts to end-turn once none are left — and it lands here as **three faces of one rule** (`web/src/ui/party/unacted.ts`), so the frame that nudges and the rail that offers can never disagree about who is waiting.

| Face | What it does |
| --- | --- |
| The frame | A seat that has taken no player action in the open window, and still could, grows a hollow **unspent pip** beside its name — in **living gold with the rail's bloom** on the one seat the next press hands over to, and in **quiet oathsteel** on every other seat that owes the window an action. |
| The rail | While such a seat exists the Action Bar's forward rail draws the unacted mark instead of Next; a press hands the console to that Hero and does **not** close the window. |
| The warning | The pilot is never the rail's target — their console is the bottom half of the screen — so their own unused window stays the skip warning's job. Both read the same two predicates. |

**The walk order is a round-robin from the pilot's seat**, not a scan from seat 0. Two seats cannot tell the two rules apart — which is how the scan shipped — and three can: from seat 0, a scan offers seat 1, then seat 0 back (the pilot has moved, and seat 0 is still first in authored order), and only then seat 2. Walking forward visits each seat once in roster order and returns to the starting seat last.

**What a window costs**, measured on temporary three- and four-seat fixtures driven through the UI (then removed — no authored Encounter seats more than two):

| Seats | Player acts with each seat offered | Player ignores every offer |
| --- | --- | --- |
| 2 | 2 presses | 3 presses |
| 3 | 3 presses | 4 presses |
| 4 | 4 presses | 5 presses |

One press per seat when the party is being played, `N+1` when it is not, against a baseline of one press to close a window. That is the price of the cap, and at four seats it is the number to watch.

**One offer per seat per window.** This is the deliberate departure from Total War, which nags until every unit has actually moved. A Hero here can be legally able to act with nothing worth doing — cards in hand, no Slot in reach — and a rail that refused to become Next until they acted would trap the window. So the rail lets go after offering a seat once; the frame keeps nudging, because the state has not changed, only the rail's claim on the player's next press. The memory lives exactly one window: every phase advance clears it.

**Two pips, because the rail's press goes to exactly one frame.** Gold means "the button at your thumb comes here"; steel means "owed, but not yet". Two seats never needed the distinction — the only waiting ally was always the next one — and three made it necessary: three identical gold marks said the same thing three times and left the player to guess which the rail meant. When the rail runs out of offers and becomes Next, no frame is gold: the pips stay, because the seats still owe the window an action, but nothing claims the press.

**Motion, on the pip and nowhere else.** Not the face: the frame carries a name, a health number and a bank, and `wb-face-pulse` dips all three under their contrast floor. Not the accent band either — that is already the status channel, where Role, the Boss's attention and a body on the floor all speak, and a fourth meaning that *moves* would make the other three ambiguous. A pip has nothing written on it and no other job, and it wears the same living-gold bloom the rail wears, so the frame and the button say one thing in one mark. It loops, which the interface direction otherwise reserves for ambient motion, on the same grounds the revive offer and the scripted turn's ring already loop: it is bounded by the player's own next press, never by a Round. Exactly one mark loops however many seats are waiting, which is that rule holding at four seats as well as at two. And gold-vs-steel is the whole distinction with the bloom removed, so a `prefers-reduced-motion` player — who gets no animation — still sees both which seats are waiting and which one is next.

**Silent by construction** in the Boss's own rows, on an ended Encounter, for a Downed Hero (who cannot act at all, so their frame carries the rescue offer and never the pip — the same precedence the tap already has, where the rescue outranks the switch), and through the scripted first turn.

## Engine mapping (first pass, `web/src/ui/party/partyFrames.ts`)

| Mock element | Engine backing |
| --- | --- |
| Name, health, Armor overlay | `HeroState` per seat; same gauge anatomy as the Hero Frame. |
| Role glyph + cloth step | `heroRole` — the Role the seat's whole deck agrees on (ADR 0035). |
| Downed / revive clock | `status: 'downed'` + `rescueDeadlineRound` (ADR 0036). The mock's fractional clock is rendered from `rescueRoundsLeft`, which is discrete (1 then 0) until a finer clock exists. |
| REVIVE · 1 CARD | `legality({kind:'revive_ally'})` — the frame lights only when the engine's own predicate would accept the rescue (ADR 0014's one-predicate discipline). Tap parks `pendingRevive`; the Hand pays, reusing the move-payment idiom. |
| Class resource segments | The seat's own Signature bank (`earnedCharges` / cap) — every seat may field one (ADR 0035). |
| Threat mark | Derived, not stored: the Hero the current program's first Role-selecting Beat resolves to, via `selectBeatTarget` — the mark and the blow read one selector and cannot disagree. |
| Unspent pip (steel) | `unactedHeroIds` (D-093) — read off the session timeline's own facts (Round, phase, `sourceId`, `succeeded`), gated by the same "could still act" predicates the skip warning uses. |
| Next-up pip (gold + bloom) | `nextNudge` — the same call the rail makes, with the same per-window offer memory, so the pip and the button can never name different seats. |
| Ally-card targeting pip | **Not wired yet.** Needs the fire-targeting gesture to offer frames as targets for `target_type: 'ally'` cards; today those cards target through the board. |
| AI badge | **No engine backing.** No AI seats exist; deferred until one does. |
| Enemy frames / dealt meter | Out of scope for the party column; the mock's enemy plates belong to the target-frame direction, not this one. |

## What this pass does not do

- ~~No authored Encounter fields a second seat yet~~ — superseded: **Embermaw: The Brand** (`embermaw_attrition_trial`) seats Elian and Maren and is reachable from the Encounter Picker, so the column draws there. The solo Encounters still render nothing, and the seam still costs the teaching slice zero pixels (ADR 0035).
- The primary Hero Frame does not yet carry the Threat mark (`primaryHasThreat` is exported and tested, unconsumed).
- **The column is not in the notification-zone table, and the overlap 1A accepted turned out to be wider than board pixels.** Growing upward from the primary frame puts the column in the dock's lane — the same strip the floating prompts stack in — and the zone geometry cannot see it, because the frames are persistent chrome with no rank to claim. The first casualty was the Beat Card, which reached the player with its rules text behind an ally frame; that was answered by moving the card to its own top-edge zone (D-098), not by modelling the column. Until it is modelled, a dock member has to be short enough to read in the strip beside the frames.
- The Status icon strip (canvas `StatusIcon`, Counters on the frame) stays with the existing Counter chips beside the Hero Frame; migrating them onto ally frames is a later pass.

## Source

The mockups are a design canvas (`Party Frames`, `Party Overlay 1A`, `PartyFrame`, `StatusIcon` artboards) built on the Oathcraft design system; the plate/face/accent vocabulary maps one-to-one onto `web/src/index.css`'s `wb-plate` / `wb-face-*` / `wb-acc-*` utilities, and the WoW party frame is the explicit anatomy reference.

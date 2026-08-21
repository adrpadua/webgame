# Party Frame Layout Direction

Status: direction chosen from the design-canvas mockups (2026-08-20). Direction **1A — left-edge overlay** is the accepted layout; 1B (left sidebar) was priced and rejected in the canvas itself. The first implementation pass is in `web/src/ui/party/` and this document records what the mockups decided, so the canvas is not the only copy.

## Two directions, one frame anatomy

The ally frame is the primary Hero's frame with the console removed: same vertical stack, same currency, no piles and no Signature button — **a readout, not a console**.

**1A — left-edge overlay (accepted).** The party column floats over board pixels at the bottom-left, growing upward from the primary frame, 138pt wide against the primary's 208pt — the ragged right edge *is* the hierarchy. The board keeps 100% of its width: 8 hex columns at 44pt, which is the tap floor exactly.

**1B — left sidebar (rejected).** A reserved 112pt column drops the board from 390 to 278pt: 5 hex columns at the tap floor, one flanking column per side of a 3-hex Boss — melee cannot circle and flanking stops being a decision. Board share falls to ~71%. What it bought (no overlap, room to grow) did not cover what it cost.

## The 40/44 rule

Every frame is **40pt tall in every state**, because a readout owes no tap target. In the moment a legal ally action exists, that frame's **hit box alone grows to 44pt and the frame is the button** — no row appears, nothing on screen moves. At most one action is legal per frame at a time, so the four-interactive-rows problem never arises.

Two doors, one action: the **hex** stays the target of record for anything spatial; the **frame** is the target of record for anything personal — this ally, wherever they are. The frame door is safe because a hex holds one body, so the frame can never be ambiguous about who is meant.

## State vocabulary (canvas 1c)

Healthy · Hurt-with-Armor · Holding Threat · Downed · Downed-nearly-gone · Downed-I-am-adjacent · Ally-card targeting · AI Hero · Revived.

## Material assignments

| Material | Carries |
| --- | --- |
| Signal cloth | The Role channel: Tank 500, Healer 300, Damage 400 (two Damage share a step; they are one Role). Holds the glyph always and the accent only at rest — the accent is the status channel, and **status outranks Role**. |
| Ember | Health, because health is what damage eats. And the revive clock. |
| Runeglass | Armor riding the health bar, and a valid card target. |
| Living gold | The class resource; Revive, the one thing the player operates here; and the unacted pip's bloom — all three are "there is a press here for you". |
| Ember coral | The Threat mark. It names the Boss's attention, not the Hero. |
| Oathsteel | The ally plate face, dim where the primary's is lit ceramic. |

## The frame is also the switch (the character-switching pass)

Single-player control arrived after the mockups and completes the frame's gesture story: **a tap on a resting ally frame takes control of that Hero** — the whole console (Hand, Action Bar, Hero Frame, board drag) swaps to the pilot, the displaced Hero joins the column, and the camera stays put. The revivable frame keeps its rescue tap: the one legal ally action still outranks the switch, which preserves the 40/44 rule's promise that a frame's grown state means exactly one thing.

The pattern is BG3's portrait click on Spirit Island's structure, per the [party-switching research note](research/2026-08-21-single-player-party-switching-bg3-spirit-island.md): switching drops in-flight gestures and keeps commitments, and the cursor survives undo because the window — not the character — is the commit boundary.

### The swap is a move, not a cut (D-097)

The first pass swapped the two frames' contents in one video frame. Both readouts were correct the instant the store wrote them, and that was the problem: the 208pt plate and the 138pt plate were simply holding different Heroes now, and nothing said the object the player had been reading had *moved*. On a portrait-click switch that sentence is the whole confirmation of the gesture.

So the frames travel. **The tapped frame flies from its slot in the column into the primary box and grows 138 → 208; the displaced Hero's frame flies the other way and shrinks into the column.** It is the layout's own claim — the ragged right edge *is* the hierarchy — said in the one channel a still frame cannot use.

| The mechanism | |
| --- | --- |
| Where it lives | `web/src/ui/party/controlSwap.ts`, bound by both frame kinds through one `useSwapFlip` hook. |
| Measure | FLIP's First runs in the **press handler**, not the effect: React batches the store write, so that is the last moment the old layout is still on screen. Both call sites that change the pilot — the frame tap and the rail's unacted press — measure the same way. |
| Claim | Each frame asks *where was I standing before this press?* **by Hero id, never by seat.** That one question serves the promoted frame, the demoted frame, and — in a party of more than two — an untouched ally whose slot index shifted because the column dropped a different name. A box is handed out once and then gone, so no later render can animate from pixels that no longer exist. |
| Curve | 300ms on `cubic-bezier(0.4, 0, 0.2, 1)`, the standard position-and-size curve. Deliberately **not** `wb-beat-deal`'s, the only other motion that moves a whole plate: that one spends 45% of its travel in the first 11% of its duration because a dealt card is an arrival, whereas here the travel *is* the message. |
| Crossing | The Hero Frame's layer sits one step above the column (`z-31`) so the plate the player tapped stays visible where the two pass through each other. At rest the two never share a pixel, so the step costs nothing anywhere else. |

Motion that carries state, fired once — the house rule, and this is as bounded as motion gets: it ends when the frames arrive.

**`prefers-reduced-motion` is honoured in JavaScript here**, which is the one place on the surface that is true. `index.css`'s freeze block reaches CSS animations and transitions; a Web Animations flight is neither, and would sail straight through it. The flight is skipped outright rather than shortened, and the swap is then exactly what it was before this pass — instant, correct, and readable.

## The unacted nudge (D-093)

Multi-character play added a failure the solo slice could not have: a seat you are not piloting can sit out a whole window in silence. Total War's campaign map is the tested answer — the end-turn button becomes "a unit has not moved", each press jumps to one, and it reverts to end-turn once none are left — and it lands here as **three faces of one rule** (`web/src/ui/party/unacted.ts`), so the frame that nudges and the rail that offers can never disagree about who is waiting.

| Face | What it does |
| --- | --- |
| The frame | A seat that has taken no player action in the open window, and still could, grows a hollow **unspent pip** beside its name, wearing the living-gold bloom (`wb-glow-ring`). |
| The rail | While such a seat exists the Action Bar's forward rail draws the unacted mark instead of Next; a press hands the console to that Hero and does **not** close the window. |
| The warning | The pilot is never the rail's target — their console is the bottom half of the screen — so their own unused window stays the skip warning's job. Both read the same two predicates. |

**One offer per seat per window.** This is the deliberate departure from Total War, which nags until every unit has actually moved. A Hero here can be legally able to act with nothing worth doing — cards in hand, no Slot in reach — and a rail that refused to become Next until they acted would trap the window. So the rail lets go after offering a seat once; the frame keeps nudging, because the state has not changed, only the rail's claim on the player's next press. The memory lives exactly one window: every phase advance clears it.

**Motion, on the pip and nowhere else.** Not the face: the frame carries a name, a health number and a bank, and `wb-face-pulse` dips all three under their contrast floor. Not the accent band either — that is already the status channel, where Role, the Boss's attention and a body on the floor all speak, and a fourth meaning that *moves* would make the other three ambiguous. A pip has nothing written on it and no other job, and it wears the same living-gold bloom the rail wears, so the frame and the button say one thing in one mark. It loops, which the interface direction otherwise reserves for ambient motion, on the same grounds the revive offer and the scripted turn's ring already loop: it is bounded by the player's own next press, never by a Round. The mark is legible with the bloom removed, so a `prefers-reduced-motion` player — who gets no animation — loses nothing but the animation.

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
| Unspent pip + its bloom | `unactedHeroIds` (D-093) — read off the session timeline's own facts (Round, phase, `sourceId`, `succeeded`), gated by the same "could still act" predicates the skip warning uses. |
| Ally-card targeting pip | **Not wired yet.** Needs the fire-targeting gesture to offer frames as targets for `target_type: 'ally'` cards; today those cards target through the board. |
| AI badge | **No engine backing.** No AI seats exist; deferred until one does. |
| Enemy frames / dealt meter | Out of scope for the party column; the mock's enemy plates belong to the target-frame direction, not this one. |

## What this pass does not do

- ~~No authored Encounter fields a second seat yet~~ — superseded: **Embermaw: The Brand** (`embermaw_attrition_trial`) seats Elian and Maren and is reachable from the Encounter Picker, so the column draws there. The solo Encounters still render nothing, and the seam still costs the teaching slice zero pixels (ADR 0035).
- The primary Hero Frame does not yet carry the Threat mark (`primaryHasThreat` is exported and tested, unconsumed).
- The Status icon strip (canvas `StatusIcon`, Counters on the frame) stays with the existing Counter chips beside the Hero Frame; migrating them onto ally frames is a later pass.

## Source

The mockups are a design canvas (`Party Frames`, `Party Overlay 1A`, `PartyFrame`, `StatusIcon` artboards) built on the Oathcraft design system; the plate/face/accent vocabulary maps one-to-one onto `web/src/index.css`'s `wb-plate` / `wb-face-*` / `wb-acc-*` utilities, and the WoW party frame is the explicit anatomy reference.

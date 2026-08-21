# 02 — Terminal-state formalization (P5)

Status: delivered (Architecture: this session)

Formalize: once an action begins resolving, its complete consequence tree resolves in deterministic order before terminal encounter state is evaluated, except where a rule defines an immediate terminal boundary. Specify and test the simultaneous cases the handoff names (Boss and Hero at 0 in one tree; detonation mid-tree; phase terminal during a tree). Today's answer is the depth-first funnel's incidental shape plus `checkResolution` call sites — make it a stated, tested rule. The sealed-Record replay and the mutation audit are the regression net.

## Delivered

The rule is stated where the recursion lives (`applyAction`/`checkResolution` in `resolve.ts`) and decided as **D-095**, four clauses: terminal state evaluates at node boundaries post-order, never mid-node; a fired card is one atomic batch (the `deferTerminalCheck` exception, now named rather than incidental); after a mid-tree ending every remaining action is refused with a recorded fact; and mutual zero is a **victory** — the Boss is asked first, because the raid promise is that the kill counts.

No behavior change: the four clauses describe what shipped, and `terminal.test.ts` (4 tests) pins each — the lethal-plus-draw atomic batch, mutual zero at the narrowest, a solo Hero's last march across two Staked hexes with the second footstep's damage refused on the record, and a post-terminal command refusal. The handoff's pathological cases reduce to these clauses: a detonation or Beat batch is clause 3, phase-terminal-during-tree is clause 1 plus `advancePhase`'s own final evaluation.

## Evidence

610 tests green (606 + 4); `verify:local` and the mutation audit recorded on the delivery commit.

# 02 — Terminal-state formalization (P5)

Status: open
Owner: Architecture (unassigned)

Formalize: once an action begins resolving, its complete consequence tree resolves in deterministic order before terminal encounter state is evaluated, except where a rule defines an immediate terminal boundary. Specify and test the simultaneous cases the handoff names (Boss and Hero at 0 in one tree; detonation mid-tree; phase terminal during a tree). Today's answer is the depth-first funnel's incidental shape plus `checkResolution` call sites — make it a stated, tested rule. The sealed-Record replay and the mutation audit are the regression net.

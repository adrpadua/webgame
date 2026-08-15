# Improve First-Turn Loadout Comprehension

Status: completed

## Approved outcome

On first view, a newcomer can tell from the screen: put a card in a slot, then press Play. The implementation clarifies the first legal loadout step using copy, hierarchy, affordances, and de-emphasis while keeping the existing rules and direct-manipulation model intact.

## Sequencing

1. UI/UX completes the separate active mobile-layout regression and proposal-10 safe-bounds hardening, then returns ownership of shared `Main.gd` surfaces.
2. UI/UX implements the smallest first-view loadout comprehension change and records the canonical presentation/accessibility contract.
3. Architecture verifies authoritative legal-state projection and no action/rules/record drift.
4. Test Automation verifies portrait presentation/accessibility/regression behavior.
5. The Orchestrator applies the Playtesting activation gate for the required newcomer-observation evidence; no Playtester exists before that gate passes.

## Non-goals

No broad HUD redesign, rules/timing/input change, contextual tutorial system, safe-bounds merger, player targeting, multiplayer UI, or all-mechanics explanation.

## Return protocol

Every assigned owner returns the mandatory packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet).

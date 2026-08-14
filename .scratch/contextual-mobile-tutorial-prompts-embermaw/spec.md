# Contextual Mobile Tutorial Prompts — Embermaw

Status: active

## Approved outcome

Deliver a small, reusable, authoritative-projection tutorial-prompt model for the Embermaw mobile raid prototype. A single dismissible prompt appears only when its authoritative encounter basis is relevant; the HUD presents it without inferring or advancing gameplay. Previously shown guidance remains reachable through Help/Rules.

## Sequencing

1. Game Design records teaching intent, the initial seven prompt contracts, and unresolved policy options in existing canonical sources.
2. The user/PM resolves the four expressly open onboarding policies before behavior is implemented.
3. Architecture owns the smallest `EncounterEngine`/projection trigger-fact seam and any presentation-metadata boundary.
4. UI/UX owns the portrait presentation, dismissal/reopen path, accessible fallback, and visibility contract.
5. Test Automation independently verifies deterministic trigger, scene/HUD, and accessibility behavior; a new-player Playtester is only commissioned after the documented activation gate and deterministic/UI evidence pass.

## Confirmed non-goals

No linear or mandatory tutorial flow; gameplay, encounter, deck, pacing, target-pattern, player-facing, or analytics-system change; prompt exposure never becomes gameplay fact or outcome input.

## Open policy decisions requiring PM/user confirmation

- Any protected next-gesture exception to the non-blocking default.
- Show-once persistence scope by prompt family.
- First-slice directive level for prompt copy.
- Help/Rules history presentation.

## Return protocol

Every owner must return the mandatory packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet) at acceptance, dependency/scope-changing discovery, and completion. The coordinator records the return before a dependent issue advances.

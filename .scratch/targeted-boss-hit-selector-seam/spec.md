# Targeted Boss Hit Selector Seam

Status: resolved

## Closure

Architecture's bounded selector/resource/resolver seam and Test Automation's independent focused packet agree with the user-confirmed Targeted Boss Tank Hit contract. Cinder Breath's separate avoidable geometry behavior remains intact. The unrelated `Main.gd` parse blocker is tracked separately and does not reopen this focused headless seam.

## Triggering design decision

`Raking Claw` is an explicit Targeted Boss Tank Hit: selector `Tank`; player text `Target: Tank. Deal 4 damage. Movement does not evade this hit.`; `damage_classification = tank_hit`; counter-tag `Mitigate` only. Avoidable geometry remains separate: Cinder Breath retains `Move` counterplay.

## Delivery sequence

1. Architecture adds the smallest selector representation and migrates the three Raking Claw resources and resolver/Timeline semantics.
2. Test Automation independently verifies selector behavior, no movement-evasion path, Cinder Breath avoidability, Riposte, content, and Encounter Record facts.

## Non-goals

No encounter tuning, new card/UI/target-pattern behavior, player-Hero facing decision, generalized targeting system, or change to the solo Round-4 evaluation boundary.

## Return protocol

Assignments and completion use the mandatory return packet in [the recovery kit](../../docs/agents/recovery-kit.md#mandatory-return-packet).

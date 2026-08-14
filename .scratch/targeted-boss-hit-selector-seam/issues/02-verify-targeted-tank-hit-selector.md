# Verify Targeted Tank Hit Selector

Status: resolved

## Final QA Return

Test Automation independently passed on 2026-08-14. `content,resolver,riposte,riposte_live,records` emitted all five expected markers and `PROBE_SUITE_OK count=5`. The focused resolver evidence proves Raking Claw hits the Tank off the former front arc, tracks the Tank's current hex, preserves `tank_hit`/selector and Riposte facts, and retains Cinder Breath as `Move`-avoidable geometry. Scene-bound `parity` and `record_scene` remain separately blocked by UI-owned `Main.gd` parse failure and are not selector closure evidence.
Owner: Test Automation
Blocked by: 01

## Outcome

Independently verify the targeted Tank selector contract and the retained Cinder Breath movement-avoidance distinction.

## Required evidence

Semantic resolver assertions for former off-arc Tank position, Cinder Breath geometry exit, exact Raking Claw resource text/tags/classification, Riposte production path, content validation, and Encounter Record fact shape.

## Non-goals

No test-driven scope expansion or changing Design intent to fit existing behavior.

## Required return

Return the mandatory packet with exact commands/results, any discrepancy, and closure recommendation.

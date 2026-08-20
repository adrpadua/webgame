# 02 — Ordering test and sealed-Record replay evidence

Status: blocked-on-01
Owner: Test Automation

## Scope

1. The ordering test: stage two subscribers answering one event on the Elian + Maren duo (the Brand trial party), assert the exact stated sequence — not merely a stable one. This is the only artifact that makes the written rule enforceable; the fingerprint proves *an* order held, not *the stated* order.
2. Replay a sealed pre-migration Encounter Record (prefer the Brand trial duo Scenario) under the new dispatch path; record `finalStateMatches` and the fingerprint match as evidence.
3. Independently verify behavior preservation: both sweeps byte-identical against the pre-migration baseline except where the D-085 rename changes content identity — and there, confirm the delta is identity-only (fingerprint) with all measured columns unchanged.

## Evidence

Test names and results in the return packet; replay output; sweep diff summary. Failures stay open with an owner and retest route.

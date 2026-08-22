# 04 — Event expansion policy (P3)

Status: open

Registry rows (entity_moved, card_drawn, hero_healed, …) are added only when a real mechanic subscribes — never speculatively. Every new row meets the ADR 0041 bar: one authoritative raise, explicit payload, deterministic subscriber ordering, restricted subscriber types, catalog validation.

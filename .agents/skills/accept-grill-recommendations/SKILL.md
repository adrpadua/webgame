---
name: accept-grill-recommendations
description: Accept the recommended answers from the current /grilling round and show a controlled-language table of the questions and selected answers. Use only when the user invokes /accept-grill-recommendations during a grilling session.
disable-model-invocation: true
---

# Accept Grill Recommendations

Fast-forward the current `/grilling` round. Treat each explicit recommendation in that round as the user's answer. Do not ask the user to repeat or confirm the answers.

1. Read the most recent unanswered grilling round. For each numbered question, extract its title and the answer after the recommendation marker.
2. Set the selected answer to that recommendation. Preserve the recommendation's meaning; remove only conversational filler.
3. Reply with this table before continuing:

| Question | Selected answer |
| --- | --- |
| Q1: <question title> | <recommended answer> |

4. Write every table cell in ASD-STE100 style:
   - Use short, direct sentences.
   - Use approved words when possible.
   - Use one meaning in each cell.
   - Do not use contractions, idioms, or vague qualifiers.
5. If every question has a recommendation, apply the selected answers to the design tree. Recompute the frontier and ask the next grilling round. If the frontier is empty, state that the grilling session is complete and wait for the user's confirmation before acting.

Only accept recommendations that are explicit in the current round. If a question has no recommendation, mark its selected answer as `No recommendation available` and ask the user to decide it. Do not invent a recommendation.

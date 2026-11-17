# Day 5 · Tuesday 17 November 2026 · Real scenarios, solid UI, deliverables

## Goal

Make the UI robust, fix what real use shows, and prepare everything to deliver.

## What I did

**Lots of feedback on the UI**, then a full update:

-   finished Hiring stages, Settings (searchable model picker with prices) and How it works;
-   a proper date picker, loading skeletons, empty states, clear "Import not found" messages, and queue rows that
    open in place.

**Real scenarios with a real AI key** showed problems that tests could not, each fixed through a directive change:

-   a thinking model spent the 1,500-token limit on thinking and the answer was cut off → medium thinking, 8,000
    tokens, 60 s (v5.5);
-   a reused connection was already closed ("socket hang up" after 27 ms) → a safe retry: at most 3 tries within the
    timeout, only for dropped connections, 429 and 502/503/504 (v5.6);
-   one bad part threw away every good AI message → each part is checked on its own and falls back alone (v5.9);
-   only the top 5 rows had AI messages → every row now uses the message for its action, at no extra cost (v5.7).

**Data and security:** the model list moved from a table to memory (v5.4), the AI on/off column became `status`, and
imports got a random UUID so number IDs never leave the server (v5.8).

**Deliverables:** Docker files per app with one root command for dev and production, the API reference with real
samples, backend and frontend READMEs, the root README as a guide, the design doc and the ERD with Mermaid diagrams,
and these submission files.

## How I used AI

-   Worked with **Claude Code** in short steps: discuss first, then implement, in easy words.
-   Set clear rules for it: never commit (I commit), never print the API key, servers in my visible terminal, no
    database migration without my approval.
-   Ran the type check and lint after each small step, and the full test suite at the key points (last run: 258 of
    258 pass).
-   After the UI rework and the AI fixes, verified the work again in a **fresh session with a different model**.
-   Asked for options before big changes, for example three ways to give every row an AI message; I chose one message
    per action.

## What I asked, and what it led to

My prompts from the session, lightly edited for grammar:

| My prompt                                                                                       | Result                                           |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| "Don't commit yourself." · "Don't print or log the key anywhere, it is the OpenRouter key."     | Working rules for the whole day                  |
| "The OpenRouter models should be cached in memory for 1 day, no need to store them in our DB." | `ai_models` table removed (v5.4)                 |
| "The UI quality is not good enough. The date picker and the calendar are too poor. Make it production ready." | shadcn-style parts on Radix, on top of Tailwind |
| "The reasoning effort, why turn it off? It should be medium."                                   | Medium reasoning, 8,000 tokens, 60 s (v5.5)      |
| "What is the real production-grade fix: keep-alive on or off, rate limits, delay?"              | Safe retry with keep-alive on (v5.6)             |
| "Can we use a single AI message and just replace the name?" … "Implement option B."             | One message per action for every row (v5.7)      |
| "When I click a row, it should open and show the details."                                      | Queue rows that open in place, with pages        |
| "You return the database primary ID; that is not secure. Add a UUID."                           | Random UUID for imports (v5.8)                   |
| "Okay, then fix it. No need for extra checking or extra logic."                                 | Each AI part checked on its own (v5.9)           |
| "One Compose file for dev and one for production, and the env inside each app."                 | Compose files and `.env` per app, root includes them |

## Accepted, rejected, corrected

| What the AI did or suggested                                     | What I did | Why                                                                        |
| ---------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| Keep the OpenRouter model list in an `ai_models` table (an earlier spec decision, v5) | Changed (v5.4) | On review, only the chosen model needs the DB; the list now lives in memory for 1 day |
| Blamed the AI failures on reused import IDs                      | Rejected   | The logs showed a dead connection after 27 ms                              |
| Turn reasoning off to fix the cut-off answers                    | Rejected   | Medium reasoning with a higher token limit keeps the quality               |
| Drop the whole AI answer when one part fails                     | Corrected  | Each part now falls back on its own                                        |
| One Docker Compose file with dev and production mixed            | Rejected   | Separate files per app, pulled in by the root files                        |

## End of day

All features, Docker and documentation are done, with a final type check and lint. Left: the two videos and the
submission.

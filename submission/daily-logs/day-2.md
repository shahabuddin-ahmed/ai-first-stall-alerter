# Day 2 · Saturday 14 November 2026 · Plan, wireframe, boilerplate

## Goal

Turn the requirements into a plan I can build from, with a wireframe, and set up the backend.

## What I did

1. **Refined the full requirements again** with a fresh mind and checked them once more.
2. **Wrote the plan in phases.** This took most of the day.
3. **Reviewed the plan several times** with ChatGPT and Claude, and finalised it based on their feedback. The
   directive changelog shows what changed:
    - **v3.1:** only facts keyed by rank go to the LLM (no names, IDs, roles or free text); digit, link and markup
      checks; one AI call per report with no hidden retries;
    - **v3.2:** my own Next.js and Node.js boilerplates, a layered backend, a browser check by the end of Day 3, a
      cache that is safe when two requests come at once, and committed expected-result files;
    - **v3.3:** OpenRouter as the AI provider; the product renamed from StallWatch to **StallAlert**;
    - **v3.4:** a template message for every alert, so a recruiter always has something to send;
    - **v4:** Express + MySQL, hiring stages with their own thresholds, `last_activity_at` resets the timer, messages
      go to whoever has to act, and duplicate uploads are caught by a unique file hash.
4. **Made a clickable wireframe** from the plan ("StallAlert Prototype" in Claude Design).
5. **Reviewed the wireframe**, gave feedback, and improved it. I updated the plan and the wireframe together, then
   locked both.
6. **At the end of the day, added the backend boilerplate** (Node.js + TypeScript, Express, MySQL).

## How I used AI

| Tool             | Used for                                                       |
| ---------------- | -------------------------------------------------------------- |
| ChatGPT + Claude | Several review rounds of the plan                              |
| Claude Design    | The clickable wireframe                                        |

## Accepted, rejected, corrected

| What came up                                          | What I did        | Why                                                      |
| ----------------------------------------------------- | ----------------- | -------------------------------------------------------- |
| Send only rank-keyed facts to the LLM                 | Accepted (v3.1)   | Nothing personal leaves the server                       |
| NestJS + PostgreSQL (v3, v3.3)                        | Replaced in v4    | My own Express + MySQL boilerplate saves setup time      |
| One time limit for every stage                        | Rejected (v4)     | Real stages take very different times                    |
| A deprecated AI SDK call, found in review             | Corrected (v3.2)  | Caught before any code was written                       |

## End of day

The plan and the wireframe are locked, and the backend boilerplate is in place. Real coding starts on Day 3.

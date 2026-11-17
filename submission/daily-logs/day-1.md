# Day 1 · Friday 13 November 2026 · Choose the option, lock the requirements

## Goal

Understand the brief, pick the option that fits this position best, and lock what the tool must and must not do.

## What I did

1. **Reviewed the brief and every option** with Claude, ChatGPT and Gemini, and picked the one that fits me and this
   position best: **Option C, Stall Alerter**. Then I locked it.
2. **Analysed Option C** with Claude and ChatGPT side by side, like talking to two people at the same time: I asked
   the same questions to both, compared the answers, and verified them myself before accepting anything.
3. **Went one-to-one** with ChatGPT and Codex on the open points.
4. **Finalised the requirements**: which features are in and which are out, the functional requirements, and the
   non-functional ones (speed with 10,000 rows, privacy, security, reliability when the AI fails).
5. **Compared three shapes for the tool on paper**, before writing any code, and locked one with a reason
   (directive changelog):
    - **v1, a command-line tool:** simple, but a recruiter would not use a terminal;
    - **v2, a browser-only app with no AI:** easy to use, but it could not say *what to do next*, the most useful
      part;
    - **v3, full stack with a guarded AI layer:** code decides who is stalled and the order; AI only writes the
      message. **Locked.** Every later version refines v3; the direction never changed again.
6. Created the repository.

## How I used AI

| Tool            | Used for                                                                 |
| --------------- | ------------------------------------------------------------------------ |
| Claude, ChatGPT, Gemini | Comparing the options and choosing one                           |
| Claude + ChatGPT in parallel | Analysing Option C: same questions to both, then comparing     |
| ChatGPT, Codex  | One-to-one questions to settle open points                               |

No answer was accepted only because a model said it: where they disagreed, I checked it against the brief myself.

## Accepted, rejected, corrected

| What came up                         | What I did                     | Why                                                      |
| ------------------------------------ | ------------------------------ | -------------------------------------------------------- |
| A weighted urgency score (v1)        | Rejected                       | Hard to explain to a recruiter; days overdue is clearer  |
| Browser-only, no backend (v2)        | Accepted, then reversed in v3  | An AI key, a cache and saved answers need a server       |
| An LLM inside the product (v3)       | Accepted                       | Writing the message is real value; deciding is not its job |

## End of day

Option C is locked and the requirements are agreed. The plan and the wireframe come next.

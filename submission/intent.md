# Intent

> Draft written from `PROPOSAL.md`, `directive.md` and the git history. Read it, change anything that is not how you
> think about it, and remove this note.

## What I am building

**StallAlert**, a web app for recruiters (Option C: Stall Alerter).

A recruiter uploads a hiring-board CSV. StallAlert checks every row, finds the candidates who have stayed in a stage
longer than that stage allows, and ranks who to follow up first. Each alert has a factual reason, an action, the person
who has to act, and a ready-to-send message. The queue can be exported as CSV.

## The problem

On a busy board, applications go quiet without anyone noticing. A candidate can sit in "Applied" for a month while
everyone thinks someone else is on it. The cost is real: good candidates accept other offers, and the hiring team
looks slow. Each stage also needs a different patience: an offer that waits 3 days is late, an interview loop that
waits 14 days may be normal. One limit for all stages either cries wolf or misses the real delays.

## Who it is for

| User                     | The question it answers                                       |
| ------------------------ | ------------------------------------------------------------- |
| Recruiter or coordinator | "Who should I chase today, and what exactly should I send?"   |
| Hiring lead              | "Where is the pipeline stuck: which stage, which recruiter?"  |
| Reviewer                 | "Can I reproduce the results, and can I see how AI was used?" |

## My rule: code decides, AI only writes

Who is stalled, by how many days, the rank, the action and who gets the message are **decided by code**, with tests
and expected results computed by a separate script. The AI only **writes text** around those facts: a short briefing,
bottleneck notes and one message per action. It never sees names or IDs, every answer is checked by code, and any
part that fails falls back to a template. If the AI is off, slow or wrong, the tool still works.

I chose this split because hiring decisions must be repeatable and explainable, and an LLM is good at wording but not
at being exactly right every time.

## What "AI-first" means for me here

1. **Several models, one decision-maker.** I work out the requirements and the plan with Claude, ChatGPT, Gemini
   and Codex, often asking two of them the same question side by side, and I verify every answer before I accept it.
2. **Spec first.** `directive.md` is the source of truth for the AI coding agent. When the output is wrong, I fix the
   directive and regenerate, and every change gets a changelog line with its reason (v1 to v5.9).
3. **AI as a builder, me as the reviewer.** The agent writes code and tests in small, reviewable steps; I read every
   change, run the checks and commit myself.
4. **Reviews by hand and by other models.** I review the code myself, and Codex, ChatGPT and Claude review the spec,
   the code and the running API. After each finished feature, a **fresh session with a different model** verifies
   it against the directive, without the builder's context. I merge what holds up.
5. **AI inside the product, guarded.** One small, checked LLM call per board, with a template fallback.

## What done looks like

1. Samples A, B and C give exactly the committed expected results.
2. A bad file never crashes the app; every bad row shows its record number, field and problem.
3. Every alert has a usable message, AI or template, and says which.
4. Only safe facts reach the LLM, and a test proves it.
5. 10,000 rows stay fast (real timings recorded).
6. A reviewer can run everything from a fresh clone with one command.

## What I am deliberately not building

Login and roles, multi-tenant, ATS integrations, sending messages, candidate scoring or hiring decisions, chat,
queues, Redis, microservices, and real candidate data. Each is a known limit, written down in the README.

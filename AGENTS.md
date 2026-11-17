# AGENTS.md

Instructions for AI coding agents working in this repository (Claude Code, Codex, Cursor, Gemini CLI and others).

## The project

StallAlert reads a hiring-board CSV, finds candidates who have stayed in a stage too long, ranks who to follow up
first, and gives each one a reason, an action and a ready-to-send message.

**The golden rule: code decides, AI only writes.** Who is stalled, the rank, the action, the recipient and the counts
are computed by tested code. The LLM inside the product only writes the briefing, bottleneck notes and one message per
action, and every answer is checked by code with a template fallback.

## Source of truth

1. [`directive.md`](directive.md) is the spec. **Read it before every task. If the code and the directive disagree,
   the directive wins.** If a rule is unclear or seems wrong, stop and ask; do not guess.
2. When behaviour changes, update the directive first and add a changelog line with the reason, then change the code.
3. Background: [`docs/DESIGN.md`](docs/DESIGN.md), [`docs/erd.md`](docs/erd.md),
   [`apps/backend/API.md`](apps/backend/API.md).

## Repository map

| Path                   | What                                                            | Agent notes                                        |
| ---------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| `apps/backend`         | Express + TypeScript + MySQL 8 API                              | [apps/backend/AGENTS.md](apps/backend/AGENTS.md)   |
| `apps/frontend`        | Next.js web app                                                 | [apps/frontend/AGENTS.md](apps/frontend/AGENTS.md) |
| `data/`                | Fictional sample CSVs and their expected results                | Never edit `data/expected/*.json` by hand          |
| `scripts/`             | `generate_expected.py`, the independent expected-results script | Change a rule here and in the app together         |
| `docs/`, `submission/` | Design, ERD, assessment deliverables                            | Docs only                                          |

## Commands

```bash
docker compose up --build                 # the whole app in development (Compose 2.20+)
cd apps/backend && yarn lint              # type check + ESLint
cd apps/backend && yarn test-unit         # fast, no database
cd apps/backend && yarn test-integ        # needs MySQL (docker compose up db -d)
cd apps/frontend && yarn lint && yarn build
```

Run the type check and lint after each small change. Run the tests for the area you touched; run the full suite before
a change is merged.

## Working rules

-   **Discuss first, then implement.** For anything bigger than a small fix, explain the plan in plain words and wait
    for approval. Use easy words and short answers.
-   **Never commit, push or create branches.** The maintainer reviews and commits every change. Suggest a commit
    message instead.
-   **Small, reviewable steps.** One feature per change, small enough to review in about two minutes.
-   **Tests first** for rules (directive Parts C and D). Never change a rule or an expected result just to make a test
    pass.
-   **No new dependencies, services or infrastructure** (queues, Redis, extra services) without asking.
-   **Never run a database migration on a shared or dev database without approval.** Never edit a migration that has
    already run; add a new one.
-   **Clean code:** no `any` in new code, no nested ternaries, no dead code, minimal comments (only the "why"), plain
    interfaces.

## Safety and privacy (never break these)

-   Never print, log or commit `AI_API_KEY` or any other secret. `.env` files stay out of git and out of images.
-   Never send candidate names, IDs, roles, stage names, dates or any CSV text to the LLM (directive Part E3).
-   Never log prompts, AI answers, file contents or rows.
-   Only fictional data in the repository.
-   Do not make paid AI calls (real `AI_API_KEY`) without asking. Tests use a mock provider.

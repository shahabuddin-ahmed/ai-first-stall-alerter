# AGENTS.md · backend

Rules for agents working in `apps/backend`. The root [AGENTS.md](../../AGENTS.md) and
[directive.md](../../directive.md) apply too. Endpoints and samples: [API.md](API.md).

## Structure

Requests go **router → controller → service → repo → model**. Keep each layer to its job.

| Layer                       | Does                                                                     | Never                                         |
| --------------------------- | ------------------------------------------------------------------------ | --------------------------------------------- |
| `src/web/router`            | Routes and middleware                                                    | Logic                                         |
| `src/web/controller`        | Joi checks with `validateRequest`, then one service call, `sendResponse` | Database or AI calls                          |
| `src/service`               | Business logic                                                           | Express objects (`req`, `res`)                |
| `src/repo`                  | Run queries and return the result                                        | Business rules, try/catch                     |
| `src/service/pipeline-*.ts` | The rules: CSV reading, analysis, messages                               | Express, Sequelize, the AI adapter, the clock |
| `src/constant`              | Enums, limits, error codes, the AI prompt                                | Magic numbers or strings anywhere else        |

-   Errors: throw the exceptions in `src/web/exception` with a code from `ERROR_CODES`. Use try/catch only when the
    error leads to another action (a fallback, a retry), never just to log it.
-   Imports have a random UUID `public_id`. The API and its responses use only that; the number `id` never leaves the
    server (look it up with `importService.resolveId`).
-   A new setting goes in `src/config/config.ts` (checked with Joi at start-up), `.env.example` and the README.

## Database

-   Tables come from migrations in `src/infra/migrations` (raw SQL, with column comments), never from
    `sequelize.sync()`.
-   **Never edit a migration that has already run.** Add a new file named `YYYYMMDDHHMMSS-what-it-does.ts` with both
    `up` and `down`.
-   Do not run migrations on the dev database without approval. Tests use a database whose name ends with `_test`.

## The AI layer (`ai.ts`, `ai-provider.ts`, `insight.ts`)

-   Only the allowlisted facts go to the LLM: ranks, day counts, action codes, keys like `R1` (directive Part E3). A
    test checks the exact keys; keep it passing.
-   Every answer goes through the code checks part by part; a failing part uses its template. Do not loosen a check
    without a directive change.
-   Changing the prompt or the checks means raising `PROMPT_VERSION` in `src/constant/ai.ts`, so saved answers are not
    reused.
-   Logs name the failed parts, never the AI text, the prompt or candidate data.
-   One call per board and no hidden retries beyond the safe retry in `ai-provider.ts`.

## Tests

| Command           | What                                                       |
| ----------------- | ---------------------------------------------------------- |
| `yarn lint`       | Type check + ESLint (run after every change)               |
| `yarn test-unit`  | Unit tests, no database                                    |
| `yarn test-integ` | Integration tests; needs MySQL (`docker compose up db -d`) |

-   Tests live next to the code in `test/` folders: `*.unit.test.ts` and `*.integ.test.ts`.
-   Integration tests share one database, so they run with `--runInBand` (the scripts already do).
-   `data/expected/*.json` comes from `scripts/generate_expected.py`. If a sample test fails, fix the code or the
    rule in both places; never edit the expected file by hand.
-   No test calls a real AI: use the mock provider in `src/web/router/v1/test/mock-ai-provider.ts`.

## Style

Prettier: 4 spaces, double quotes, 120 columns. Format only the files you change (`npx prettier --write <file>`),
never the whole repository.

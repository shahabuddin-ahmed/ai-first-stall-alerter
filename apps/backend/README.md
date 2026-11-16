# StallAlert backend (`apps/backend`)

Node.js + TypeScript + Express API with MySQL 8 (Sequelize). It started from my own Express/MySQL boilerplate
(baseline commit `e90ed03`). Everything after that commit is quest work.

It reads a hiring-board CSV, finds stalled candidates, ranks who to follow up first, and writes a message for each.
**Code decides** who is stalled, the order, the action and who the message goes to. **AI only writes text**, and any
AI problem falls back to template messages.

## Run with Docker (one command)

```bash
cd apps/backend
cp .env.example .env        # optional: ports, passwords, AI key
docker compose up
```

Docker starts MySQL, creates the database, runs the migrations and the seed, then starts the API.

-   API: http://localhost:4000/api/v1 (health: `/api/v1/health`)
-   phpMyAdmin: http://localhost:8080
-   MySQL: localhost:3306 (set `MYSQL_PORT=3307` in `.env` if another MySQL already uses 3306)

## Run the API locally (MySQL in Docker)

```bash
yarn install
docker compose up db -d
yarn db:migrate && yarn db:seed   # db:migrate creates the database if it is missing
yarn dev
```

## Settings (`.env`)

| Setting                                                                      | Default                        | What it does                                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `APPLICATION_SERVER_PORT`                                                    | `4000`                         | API port                                                                                           |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` | `root` / `root` (local only)   | Database. Created if missing. Tests always use `MYSQL_TEST_DATABASE` (`stallalert_test`)           |
| `WEB_ORIGIN`                                                                 | `http://localhost:3000`        | Browser origins allowed to call the API (comma-separated)                                          |
| `RATE_LIMIT_UPLOADS_PER_MINUTE`                                              | `20`                           | Uploads per IP per minute                                                                          |
| `RATE_LIMIT_INSIGHTS_PER_MINUTE`                                             | `10`                           | AI insights requests per IP per minute                                                             |
| `AI_API_KEY`                                                                 | empty                          | OpenRouter key. Empty = templates only. The key never leaves the server                            |
| `AI_BASE_URL`                                                                | `https://openrouter.ai/api/v1` | Any OpenAI-compatible endpoint                                                                     |
| `AI_TOP_N`                                                                   | `5`                            | AI briefing looks at the top N alerts. Messages: one AI draft per action, used for every candidate |
| `AI_TIMEOUT_MS`, `AI_MAX_OUTPUT_TOKENS`                                      | `15000`, `1500`                | Limits for one AI call (timeout up to 120000 = 2 minutes)                                          |
| `AI_REASONING_EFFORT`                                                        | `low`                          | Thinking models: `off` (fastest), `low`, `medium`, `high`; `none` = not sent                       |
| `AI_MODE`                                                                    | `live`                         | `fake` = built-in stand-in, no network (tests and demos)                                           |

Every value is checked at start-up. A wrong value stops the API with a clear message.

The AI model is picked in the settings (default `inclusionai/ling-3.2-flash:free`). Only free models that support
JSON output are listed. Tested with Ling and `AI_REASONING_EFFORT=off`: one real call
answered in 9 seconds and passed every check.

## API (`/api/v1`)

| Method    | Path                                                                    | What it does                                                                                       |
| --------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| GET       | `/health`                                                               | API and database status (200 or 503)                                                               |
| GET · PUT | `/stages`                                                               | Read or save the hiring stages (save needs the current `version`, else 409)                        |
| GET · PUT | `/settings`                                                             | Read or save AI drafts on/off and the AI model (`aiModel`); shows if AI is set up (never the key)  |
| GET       | `/settings/models`                                                      | Free models you can pick (OpenRouter list, saved in the DB and refreshed every 30 minutes)         |
| POST      | `/imports`                                                              | Upload a CSV (`file`, `referenceDate`). 201 new, 200 if the same file was already imported         |
| GET       | `/imports`                                                              | List imports, newest first                                                                         |
| GET       | `/imports/:id?referenceDate=&stage=&recruiter=&search=&page=&pageSize=` | Counts, bottlenecks and the ranked queue, recalculated                                             |
| GET       | `/imports/:id/errors?referenceDate=&page=`                              | Row errors                                                                                         |
| POST      | `/imports/:id/insights`                                                 | Briefing, bottleneck notes and one message per action (AI or templates); the top N shown filled in |
| GET       | `/imports/:id/export?referenceDate=&stage=&recruiter=&search=`          | CSV download (never calls the AI)                                                                  |
| DELETE    | `/imports/:id`                                                          | Delete an import, its rows and its cached AI answers                                               |

Errors always look like `{ code, message, response: null, errors: [...] }`. File errors: `FILE_TOO_LARGE` (413),
`UNSUPPORTED_FILE` (415), `EMPTY_FILE`, `INVALID_ENCODING`, `MISSING_HEADERS`, `DUPLICATE_HEADERS`, `INVALID_CSV`,
`TOO_MANY_ROWS`, `VALUE_TOO_LONG` (422).

## Database

Tables are created by migrations (`src/infra/migrations`), never by `sequelize.sync()`. The API refuses to start while a
migration is pending.

```bash
yarn db:migrate          # create or update the tables
yarn db:seed             # add the default hiring stages and settings (runs once)
yarn db:migrate:status   # list done and pending migrations
yarn db:migrate:down     # undo the last migration
yarn db:seed:down        # remove the default data
```

| Table            | What it stores                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `imports`        | One uploaded file (unique file hash, so the same file is stored once)                                                                                                                                  |
| `import_records` | The rows of a file: 5 text columns (candidate_id up to 36 characters, stage up to 30, name, role and recruiter up to 50), 3 DATE columns, and `invalid_dates` for wrong dates; deleted with the import |
| `stages`         | Hiring stages: name, type, threshold, order, aliases, action code                                                                                                                                      |
| `settings`       | One row: AI drafts on/off, the AI model and the stages version (goes up on each stages save)                                                                                                           |
| `ai_insights`    | Cached, validated AI answers (placeholders, no names); deleted with the import                                                                                                                         |
| `ai_models`      | Free OpenRouter models that support JSON output; refreshed every 30 minutes                                                                                                                            |
| `llm_calls`      | One row per AI call: model, tokens, cost, time, status; never the text                                                                                                                                 |

To change a table, add a new migration file. Never edit one that has already run.

## Tests and checks

```bash
yarn lint         # type check + ESLint
yarn format       # format every file with Prettier (yarn format:check only checks)
yarn test         # all tests
yarn test-unit    # unit only (no database)
yarn test-integ   # integration (needs MySQL; creates and uses the stallalert_test database)
yarn perf         # 10,000-row speed test against a running API (add --insights with AI_MODE=fake)
```

The expected results in `data/expected/*.json` come from `scripts/generate_expected.py` (Python, written separately
from the app). The rules tests must match them exactly. No test calls a real AI.

## Speed (10,000 rows, measured)

`yarn perf --insights`, 3 runs, API on a laptop (Apple Silicon, MySQL 8 in Docker), `AI_MODE=fake`:

| Step                              | Median | Slowest | Target     |
| --------------------------------- | ------ | ------- | ---------- |
| Upload (10,000 rows, 773 KB)      | 261 ms | 408 ms  | ≤ 3,000 ms |
| Recalculate the queue (GET board) | 49 ms  | 65 ms   | ≤ 300 ms   |
| Row errors                        | 47 ms  | 49 ms   | -          |
| Export CSV                        | 89 ms  | 97 ms   | -          |
| AI insights, cached               | 55 ms  | 99 ms   | ≤ 200 ms   |

A first AI call adds the model's own time (about 9 s with the free model above). Reading 10,000 rows from MySQL is
fast enough, so no extra in-memory cache was added.

## Security and privacy

-   The AI only gets ranks, day counts, action codes and keys like `R1`: never names, IDs, stage names, dates or CSV text.
-   Every AI answer is checked (ranks, lengths, placeholders, no digits or links in messages, no made-up numbers).
-   Uploads: max 5 MB, 10,000 rows, `.csv` only, kept in memory and never written to disk.
-   Joi checks every request. Parameterised queries only (Sequelize).
-   CORS for the web app only, security headers (helmet), rate limits on uploads and AI insights.
-   Export: values that could run as spreadsheet formulas get a `'` in front.
-   Logs: one JSON line per request with a request id, path (no query string), status and time. Server errors log only
    the error type; no stack traces or candidate data in responses.

## Known limits

-   **No sign-in.** Single team, local use, fictional data.
-   **One API process.** Stages, settings, rate-limit counts and "AI call in progress" live in memory. Several API
    processes would need a shared store (for example Redis) and a database lock for AI calls.
-   Free AI models can be slow or busy. When they fail or time out, templates are used and Retry works.

Local development only. The credentials in `docker-compose.yml` and `.env.example` are placeholders for fictional data.

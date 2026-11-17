# StallAlert backend (`apps/backend`)

Node.js + TypeScript + Express API with MySQL 8 (Sequelize) and Joi. It started from my own Express/MySQL boilerplate
(baseline commit `e90ed03`). Everything after that commit is quest work.

It reads a hiring-board CSV, finds stalled candidates, ranks who to follow up first, and writes a message for each.
**Code decides** who is stalled, the order, the action and who the message goes to. **AI only writes text**, and any
AI problem falls back to template messages.

**API reference with sample requests and responses: [API.md](API.md).**

## Run with Docker

```bash
cd apps/backend
cp .env.example .env        # optional: add AI_API_KEY for AI drafts
docker compose up --build
```

This starts MySQL, phpMyAdmin and the API in development mode: saving a file in `src/` restarts the API (nodemon).
The API creates the database, runs the migrations and the seed, then starts. To run it with the web app, use
`docker compose up --build` in the repository root instead.

| What       | Address                             |
| ---------- | ----------------------------------- |
| API        | http://localhost:4000/api/v1        |
| Health     | http://localhost:4000/api/v1/health |
| MySQL      | localhost:3306 (root / root)        |
| phpMyAdmin | http://localhost:8080               |

After you change `.env`, run `docker compose up -d backend` (a plain restart does not read it again).

Production mode (production image, no phpMyAdmin, MySQL not open to the host):

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

## Run without Docker (MySQL in Docker)

```bash
yarn install
docker compose up db -d
yarn db:migrate && yarn db:seed   # db:migrate creates the database if it is missing
yarn dev
```

## Run the built API (production)

```bash
yarn install --frozen-lockfile
yarn build                 # TypeScript → dist/
yarn db:migrate:prod       # same migrations, from dist/
yarn db:seed:prod
yarn start                 # node dist/server.js (no ts-node needed)
```

The `Dockerfile` does the same in two steps: it builds in the first, and the run image has only the production
packages and `dist/`. It runs the migrations and the seed, then starts the API. Settings and secrets (`MYSQL_*`,
`AI_API_KEY`, ...) are passed in when the container starts; `.env` files are never copied into an image.

## Settings (`.env`)

Both Compose files and `yarn dev` read `.env` in this folder. Inside Docker, Compose sets `MYSQL_HOST=db` and
`MYSQL_PORT=3306` itself.

| Setting                                                                      | Default                        | What it does                                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                                   | `development`                  | `production` in the production image                                                          |
| `APPLICATION_SERVER_PORT`                                                    | `4000`                         | API port                                                                                      |
| `APP_FORCE_SHUTDOWN_SECOND`                                                  | `30`                           | How long a shutdown waits for open requests                                                   |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` | `root` / `root` (local only)   | Database. Created if missing. `MYSQL_PASSWORD` is also the MySQL root password in Docker      |
| `MYSQL_TEST_DATABASE`                                                        | `stallalert_test`              | The database the tests use                                                                    |
| `WEB_ORIGIN`                                                                 | `http://localhost:3000`        | Browser origins allowed to call the API (comma-separated)                                     |
| `RATE_LIMIT_UPLOADS_PER_MINUTE`                                              | `20`                           | Uploads per IP per minute                                                                     |
| `RATE_LIMIT_INSIGHTS_PER_MINUTE`                                             | `10`                           | AI insights requests per IP per minute                                                        |
| `AI_API_KEY`                                                                 | empty                          | OpenRouter key. Empty = templates only. The key never leaves the server                       |
| `AI_BASE_URL`                                                                | `https://openrouter.ai/api/v1` | Any OpenAI-compatible endpoint                                                                |
| `AI_TOP_N`                                                                   | `5`                            | How many top alerts the AI briefing looks at. Every row still gets the message for its action |
| `AI_TIMEOUT_MS`                                                              | `60000`                        | Time for one AI call, retries included (up to 120000 = 2 minutes)                             |
| `AI_MAX_OUTPUT_TOKENS`                                                       | `8000`                         | Output limit for one AI call. A thinking model's thinking counts toward it                    |
| `AI_REASONING_EFFORT`                                                        | `medium`                       | Thinking models: `off` (fastest), `low`, `medium`, `high`; `none` = not sent                  |

Every value is checked at start-up. A wrong value stops the API with a clear message.

The AI model is picked in Settings (default `inclusionai/ling-3.2-flash:free`). Only OpenRouter models that support
JSON output are listed, with their prices.

## API (`/api/v1`)

Full details, samples and error codes: **[API.md](API.md)**.

| Method    | Path                    | What it does                                                           |
| --------- | ----------------------- | ---------------------------------------------------------------------- |
| GET       | `/health`               | API and database status (200 or 503)                                   |
| GET · PUT | `/stages`               | Read or save the hiring stages (save needs the current `version`)      |
| GET · PUT | `/settings`             | Read or save AI drafts on/off (`status`) and the AI model              |
| GET       | `/settings/models`      | Models you can pick (OpenRouter list, cached in memory for 1 day)      |
| POST      | `/imports`              | Upload a CSV. 201 new, 200 if the same file was already imported       |
| GET       | `/imports`              | List imports, newest first                                             |
| GET       | `/imports/:id`          | Counts, bottlenecks and the ranked queue for a date                    |
| GET       | `/imports/:id/errors`   | Row errors with record number, field and problem                       |
| POST      | `/imports/:id/insights` | Briefing, bottleneck notes and one message per action (AI or template) |
| GET       | `/imports/:id/export`   | CSV download (never calls the AI)                                      |
| DELETE    | `/imports/:id`          | Delete an import, its rows and its saved AI answers                    |

Import IDs are random UUIDs; the database number IDs never leave the server.

## How the AI part works

1. Code analyses the board: who is stalled, the rank, the action and who gets the message.
2. `POST /imports/:id/insights` sends the AI only safe facts: ranks, day counts, action codes and keys like `R1`.
   Never names, candidate IDs, roles, stage names, dates or CSV text.
3. The AI writes a briefing, one note per bottleneck, and **one message per action code** in the queue, with
   placeholders (`{{first_name}}`, `{{name}}`, `{{role}}`, `{{recruiter}}`). Every row with that action uses it.
4. Code checks each part on its own: the right person, no digits, dates, weekdays or timing promises, no links, only
   known placeholders, and length limits. A part that fails uses its template; the good parts stay.
5. The checked answer is saved per import, date, stages version and model, so the AI is called **once per board**.
   A failed call is remembered and repeated only on **Retry AI** (`"retry": true`).

A call retries safely on a dropped connection, `429` (it waits for `Retry-After`, up to 10 s) and `502`/`503`/`504`,
at most 3 tries within `AI_TIMEOUT_MS`. Every call is logged in `llm_calls` (model, tokens, cost, time, status), never
the text.

The checks are limited safeguards: they cannot catch every unsupported claim (such as "your offer is approved"), so
code makes every decision and each AI draft is labelled for a person to review before sending.

## CSV rules

Required columns: `candidate_id`, `name`, `role`, `stage`, `stage_entered_at`, `recruiter`. Optional:
`last_activity_at`, `last_contacted_at`. Dates are `YYYY-MM-DD`.

-   A column with a blank header is an extra column and is ignored (spreadsheets often add a trailing comma).
-   A row with the wrong number of fields gets only that error. Its columns may be shifted, so its `candidate_id` is not
    used for the duplicate-ID check.

Both rules match `scripts/generate_expected.py`.

## Code structure

Requests go **router → controller → service → repo → model**.

| Folder               | What it holds                                                             |
| -------------------- | ------------------------------------------------------------------------- |
| `src/web/router`     | Routes per resource (`/api/v1/...`)                                       |
| `src/web/controller` | Joi checks for each request, then calls a service                         |
| `src/web/middleware` | Security headers, CORS, rate limits, CSV upload, request id, logs, errors |
| `src/web/exception`  | HTTP errors (400, 404, 409, ...)                                          |
| `src/service`        | Business logic: CSV reading, analysis, messages, AI, export, settings     |
| `src/repo`           | Database queries                                                          |
| `src/model`          | Sequelize models                                                          |
| `src/constant`       | Enums, limits, error codes, the AI prompt                                 |
| `src/config`         | `.env` loading and checks                                                 |
| `src/infra`          | Database connection, migrations, seeders, logger                          |

## Database

Tables are created by migrations (`src/infra/migrations`), never by `sequelize.sync()`. The API refuses to start while a
migration is pending. Done migrations and seeds are kept in the `migrations` and `seeders` tables, by name without the
`.ts`/`.js` ending, so `yarn dev` and the built app see the same history.

```bash
yarn db:migrate          # create or update the tables
yarn db:seed             # add the default hiring stages and settings (runs once)
yarn db:migrate:status   # list done and pending migrations
yarn db:migrate:down     # undo the last migration
yarn db:seed:down        # remove the default data
```

| Table            | What it stores                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `imports`        | One uploaded file (unique file hash, so the same file is stored once); the API uses its UUID `public_id`                                                                                               |
| `import_records` | The rows of a file: 5 text columns (candidate_id up to 36 characters, stage up to 30, name, role and recruiter up to 50), 3 DATE columns, and `invalid_dates` for wrong dates; deleted with the import |
| `stages`         | Hiring stages: name, type, threshold, order, aliases, action code                                                                                                                                      |
| `settings`       | One row: AI drafts on/off (`status`), the AI model and the stages version (goes up on each stages save)                                                                                                |
| `ai_insights`    | Saved, checked AI answers (placeholders, no names); deleted with the import                                                                                                                            |
| `llm_calls`      | One row per AI call: model, tokens, cost, time, status; never the text                                                                                                                                 |

To change a table, add a new migration file. Never edit one that has already run.

## Tests and checks

```bash
yarn lint         # type check + ESLint
yarn format       # format every file with Prettier (yarn format:check only checks)
yarn test         # all tests
yarn test-unit    # unit only (no database)
yarn test-integ   # integration (needs MySQL; creates and uses the stallalert_test database)
yarn perf         # 10,000-row speed test against a running API (--insights also calls the real AI once per run)
```

The expected results in `data/expected/*.json` come from `scripts/generate_expected.py` (Python, written separately
from the app). The pipeline tests must match them exactly. No test calls a real AI.

## Speed (10,000 rows, measured)

`yarn perf --insights`, 3 runs, API on a laptop (Apple Silicon, MySQL 8 in Docker), with a stand-in AI:

| Step                                     | Median | Slowest | Target     |
| ---------------------------------------- | ------ | ------- | ---------- |
| Upload (10,000 rows, 773 KB)             | 261 ms | 408 ms  | ≤ 3,000 ms |
| Recalculate the queue (GET /imports/:id) | 49 ms  | 65 ms   | ≤ 300 ms   |
| Row errors                               | 47 ms  | 49 ms   | -          |
| Export CSV                               | 89 ms  | 97 ms   | -          |
| AI insights, cached                      | 55 ms  | 99 ms   | ≤ 200 ms   |

A first AI call adds the model's own time. Reading 10,000 rows from MySQL is fast enough, so no extra in-memory cache
was added.

## Security and privacy

-   The AI only gets ranks, day counts, action codes and keys like `R1`: never names, IDs, stage names, dates or CSV text.
-   Every AI answer is checked part by part (ranks, lengths, placeholders, no digits or links in messages, no made-up
    numbers).
-   Uploads: max 5 MB, 10,000 rows, `.csv` only, kept in memory and never written to disk.
-   Joi checks every request. Parameterised queries only (Sequelize).
-   CORS for the web app only, security headers (helmet), rate limits on uploads and AI insights.
-   Export: values that could run as spreadsheet formulas get a `'` in front.
-   Logs: one JSON line per request with a request id, path (no query string), status and time. Server errors log only
    the error type; no stack traces or candidate data in responses. AI logs name a failed part, never the AI text.

## Known limits

-   **No sign-in.** Single team, local use, fictional data.
-   **One API process.** Stages, settings, the model list, rate-limit counts and "AI call in progress" live in memory.
    Several API processes would need a shared store (for example Redis) and a database lock for AI calls.
-   AI models can be slow or busy. When they fail or time out, templates are used. The failure is remembered, so the AI
    is asked again only on Retry.

The credentials in `docker-compose.yml` and `.env.example` are placeholders for local use with fictional data.

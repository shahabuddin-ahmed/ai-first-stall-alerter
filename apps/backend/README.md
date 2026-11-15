# StallAlert backend (`apps/backend`)

Node.js + TypeScript + Express API with MySQL 8 (Sequelize). It started from my own Express/MySQL boilerplate
(baseline commit `e90ed03`). Everything after that commit is quest work.

## Run with Docker (API + MySQL + phpMyAdmin)

```bash
cd apps/backend
cp .env.example .env        # optional: change ports or passwords
yarn install
docker compose up
```

- API: http://localhost:4000/api/v1 (health: `/api/v1/health`)
- phpMyAdmin: http://localhost:8080
- MySQL: localhost:3306, database `stallalert` (utf8mb4)

## Run the API locally (MySQL in Docker)

```bash
docker compose up db -d
yarn dev
```

## Database

Tables are created by migrations (`src/infra/migrations`), never by `sequelize.sync()`. The API refuses to start while a
migration is pending. Docker runs `db:migrate` and `db:seed` before starting the API.

```bash
yarn db:migrate          # create or update the tables
yarn db:seed             # add the default hiring stages and settings (runs once)
yarn db:migrate:status   # list done and pending migrations
yarn db:migrate:down     # undo the last migration
yarn db:seed:down        # remove the default data
```

| Table | What it stores |
|---|---|
| `imports` | One uploaded file (unique file hash, so the same file is stored once) |
| `import_records` | The rows of a file: the 8 CSV columns as raw text; deleted with the import |
| `stages` | Hiring stages: name, type, threshold, order, aliases, action code |
| `settings` | One row: AI drafts on/off and the stages version |
| `ai_insights` | Cached, validated AI answers (placeholders, no names); deleted with the import |
| `llm_calls` | One row per AI call: model, tokens, cost, time, status; never the text |
| `posts` | Boilerplate sample |

To change a table, add a new migration file. Never edit one that has already run.

## Tests

```bash
yarn test         # all
yarn test-unit    # unit only
yarn test-integ   # integration only (needs MySQL: docker compose up db -d; uses the stallalert_test database)
```

Local development only. The credentials in `docker-compose.yml` and `.env.example` are placeholders for fictional data.

# StallAlert

A tool for recruiters. Upload a hiring-board CSV, and StallAlert finds candidates who have stayed in a stage too long,
ranks who to follow up first, and gives each one a reason, an action and a ready-to-send message.

**Code decides, AI only writes.** Code decides who is stalled, the order, the action and who the message goes to, with
tests. The AI (OpenRouter) only writes the briefing and one message draft per follow-up action, used for every alert. Every AI answer is checked by
code, and any problem falls back to template messages.

**Where it fits.** A job-seeker app like Match Hire shows each application as "waiting on you" or "with the hiring
team", with a follow-up cadence. Without a limit per stage, an application can sit in review for months and still look
"on track". StallAlert is the employer-side engine for that screen: every stage has its own limit, so a long wait is
flagged, ranked, and given a message for whoever has to act (the candidate or the hiring team).

Five-day assessment, Option C (Stall Alerter). Built AI-first.

## Status

| Part                       | State                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Backend API                | Done: upload, validation, ranking, hiring stages, settings, AI insights with checks, export |
| Frontend (`apps/frontend`) | Done: import, follow-up queue with AI insights, export, hiring stages, settings             |

## Repository

| Path                           | What                                                                  |
| ------------------------------ | --------------------------------------------------------------------- |
| `apps/backend`                 | Express + TypeScript + MySQL 8 API ([README](apps/backend/README.md)) |
| `apps/frontend`                | Next.js web app ([README](apps/frontend/README.md))                   |
| `data/sample-*.csv`            | Fictional sample files A, B and C                                     |
| `data/expected/*.json`         | Expected results for the samples                                      |
| `scripts/generate_expected.py` | Makes the expected results, written separately from the app (Python)  |
| `directive.md`                 | The rules the app is built from, with a changelog                     |
| `PROPOSAL.md`                  | The product proposal                                                  |

## Run it (fresh clone)

You only need Docker. From the repository root:

```bash
cp .env.example .env   # optional: add AI_API_KEY for AI drafts
docker compose up --build
```

This starts MySQL, the API and the web app together. The API creates the database, runs the migrations and the seed
(10 default hiring stages), then starts. When it is healthy, the web app starts.

| What       | Address                             |
| ---------- | ----------------------------------- |
| Web app    | http://localhost:3000               |
| API        | http://localhost:4000/api/v1        |
| Health     | http://localhost:4000/api/v1/health |
| MySQL      | localhost:3306 (root / root)        |
| phpMyAdmin | http://localhost:8080               |

AI limits (`AI_MAX_OUTPUT_TOKENS`, `AI_REASONING_EFFORT`, `AI_TIMEOUT_MS`, `AI_TOP_N`) are set in the same root `.env`;
in Docker they win over `apps/backend/.env`. Ports busy? Change `WEB_PORT`, `API_PORT`, `MYSQL_HOST_PORT` or
`PMA_PORT` in `.env`. Stop with `Ctrl+C`;
`docker compose down -v` also deletes the database.

### Run for development (live reload)

Same command plus the dev file. Your code folders are linked into the containers, so saving a file reloads the app:
the API restarts (nodemon) and the web app refreshes (Next.js dev).

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Without Docker: `cd apps/backend && yarn dev` and `cd apps/frontend && yarn dev`, each with its own `.env` from
`.env.example`.

Open http://localhost:3000, click **Start: import a board**, and use **Download sample CSV** (Sample B) with the
reference date `2026-11-13`.

**AI is optional.** Without `AI_API_KEY` in `.env`, everything works and every message is a template. To get AI
drafts, put an OpenRouter key in `AI_API_KEY` (the root `.env` for Docker, `apps/backend/.env` for development) and
restart. The model is picked in the settings (default
`inclusionai/ling-3.2-flash:free`); `GET /settings/models` lists the choices.

## Deploy to production

In production each part runs on its own server. Each app has its own Dockerfile and is built and deployed on its own;
the root `docker-compose.yml` is only for running everything on one machine.

| Part     | Runs on                                 | Settings                                                                                    |
| -------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Database | A managed MySQL 8 (for example AWS RDS) | Back it up; the API creates its tables                                                      |
| API      | `apps/backend/Dockerfile`               | `NODE_ENV=production`, `MYSQL_*`, `AI_API_KEY` (secret), `WEB_ORIGIN=https://<web address>` |
| Web app  | `apps/frontend/Dockerfile` (or Vercel)  | `NEXT_PUBLIC_API_URL`, set when the image is built                                          |

```bash
docker build -t stallalert-api apps/backend
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 -t stallalert-web apps/frontend
```

The API runs the migrations and the default data on every start (only what is missing), then serves on port 4000.
`WEB_ORIGIN` lets only your web app call the API from a browser. Put both behind HTTPS. Keep `AI_API_KEY` in the
server's secret store, never in an image or in git.

## Demo with Sample B (API)

Run these from the repository root. Sample B at reference date `2026-11-13` should give **18 stalled** candidates and
**11 row errors**. Import IDs are random UUIDs: copy `response.import.id` from the upload answer into `ID` below.

```bash
curl -F file=@data/sample-b.csv -F referenceDate=2026-11-13 http://localhost:4000/api/v1/imports
```

```bash
curl "http://localhost:4000/api/v1/imports/$ID/errors?referenceDate=2026-11-13"
```

```bash
curl -X POST -H "Content-Type: application/json" -d '{"referenceDate":"2026-11-13"}' http://localhost:4000/api/v1/imports/$ID/insights
```

```bash
curl -o stallalert.csv "http://localhost:4000/api/v1/imports/$ID/export?referenceDate=2026-11-13"
```

1. The upload answers with the counts, the bottlenecks and the ranked queue. Uploading the same file again returns the
   first import (`alreadyImported: true`).
2. `errors` lists every bad row with its record number, field and problem.
3. `insights` writes the briefing and one AI draft per follow-up action. With a key this makes **one** AI call; asking again
   uses the saved answer. Without a key, or if the AI fails, you get templates and `aiStatus` says why. A failed try
   is not repeated on its own: send `"retry": true` to ask the AI again.
4. The CSV has every stalled candidate. Ranks 1 to 5 use the AI drafts, the rest use templates (`ai_note_status`).

To see the template fallback with a key set, turn AI off and ask again:

```bash
curl -X PUT -H "Content-Type: application/json" -d '{"status":0,"aiModel":"inclusionai/ling-3.2-flash:free"}' http://localhost:4000/api/v1/settings
```

The full API list, settings, database commands and measured speed are in the [backend README](apps/backend/README.md).

## Tests

```bash
cd apps/backend
yarn install
docker compose up db -d
yarn lint
yarn test
```

`yarn test` runs the unit and integration tests against a separate `stallalert_test` database. The pipeline tests must
match `data/expected/*.json` exactly. No test calls a real AI.

## Privacy

The AI only gets ranks, day counts, action codes and keys like `R1`: never names, candidate IDs, roles, stage names,
dates or CSV text. Names are filled into the drafts on the server. All sample data is fictional.

## Known limits

This is a local, single-user assessment build with fictional data. Before a public launch with real hiring data it
would need:

- **Login and roles**, so only the right people see or change a team's imports and settings.
- **One shared store** (for example Redis) if the API runs as several copies. Today the settings, the model list and
  "one AI call at a time" live in the memory of one API process.
- **AI spending limits** per team (today: rate limits per IP, and one call per report).
- **Data retention rules**: imports stay until someone deletes them.

Also good to know:

- The AI checks are limited safeguards, not a proof that a draft is true. Every AI draft is labelled
  **AI draft · review before use**.
- The model list is cached in memory for 1 day. If OpenRouter cannot be reached, Settings says so and the saved model
  keeps working.
- A database set up before migration names lost their `.ts` ending needs a one-time rename of its `migrations` and
  `seeders` rows. A fresh clone does not.

## License

MIT, see [LICENSE](LICENSE).

Hello, we have a candidate, Hana Novak, for the Product Designer position, whose application is awaiting your review. Could you please review the application and let us know the next step? Thank you. Recruiter C

Hello, we have a candidate, Jonas Berg, for the QA Engineer position, whose application is awaiting your review. Could you please review the application and let us know the next step? Thank you. Recruiter A

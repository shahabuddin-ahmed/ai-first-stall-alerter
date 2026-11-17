# StallAlert

A tool for recruiters. Upload a hiring-board CSV, and StallAlert finds candidates who have stayed in a stage too long,
ranks who to follow up first, and gives each one a reason, an action and a ready-to-send message.

**Code decides, AI only writes.** Code decides who is stalled, the order, the action and who the message goes to, with
tests. The AI (OpenRouter) only writes the briefing and one message per follow-up action. Every AI answer is checked
by code, and any part that fails falls back to its template.

**Where it fits.** A job-seeker app like Match Hire shows each application as "waiting on you" or "with the hiring
team", with a follow-up cadence. Without a limit per stage, an application can sit in review for months and still look
"on track". StallAlert is the employer-side engine for that screen: every stage has its own limit, so a long wait is
flagged, ranked, and given a message for whoever has to act (the candidate or the hiring team).

Five-day assessment, Option C (Stall Alerter). Built AI-first.

## Start here

| If you want to...                                  | Read                                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| Run the whole app in one command                   | [Quick start](#quick-start) below                                                |
| Check the assessment step by step                  | [How to review](#how-to-review) below                                            |
| Understand the product and the scope               | [PROPOSAL.md](PROPOSAL.md)                                                       |
| See how it is built (diagrams, AI flow, tradeoffs) | [docs/DESIGN.md](docs/DESIGN.md)                                                 |
| See the database tables                            | [docs/erd.md](docs/erd.md)                                                       |
| See the rules the app is built from                | [directive.md](directive.md) (with a changelog)                                  |
| See the submission (intent, daily logs, unlearned) | [submission/](submission/README.md)                                              |
| Work on the API                                    | [Backend README](apps/backend/README.md)                                         |
| Call the API (samples for every endpoint)          | [API reference](apps/backend/API.md)                                             |
| Work on the web app                                | [Frontend README](apps/frontend/README.md)                                       |
| Work on it with an AI coding agent                 | [AGENTS.md](AGENTS.md) (also read by Claude Code through [CLAUDE.md](CLAUDE.md)) |

## Repository

| Path                           | What                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| `apps/backend`                 | Express + TypeScript + MySQL 8 API                                   |
| `apps/frontend`                | Next.js web app                                                      |
| `data/sample-*.csv`            | Fictional sample files A, B and C                                    |
| `data/expected/*.json`         | Expected results for the samples                                     |
| `docs/`                        | Design and ERD, with Mermaid diagrams                                |
| `submission/`                  | The assessment deliverables: intent, daily logs, unlearned           |
| `scripts/generate_expected.py` | Makes the expected results, written separately from the app (Python) |
| `docker-compose.yml`           | The whole app, development (pulls in each app's Compose file)        |
| `docker-compose.prod.yml`      | The whole app, production on one server                              |

## Quick start

You need Docker with Compose 2.20 or newer (`docker compose version`). From the repository root:

```bash
cp apps/backend/.env.example apps/backend/.env     # optional: add AI_API_KEY for AI drafts
cp apps/frontend/.env.example apps/frontend/.env
docker compose up --build
```

The API creates the database, runs the migrations and the seed (10 default hiring stages), then starts. Saving a file
reloads the app.

| What       | Address                             |
| ---------- | ----------------------------------- |
| Web app    | http://localhost:3000               |
| API        | http://localhost:4000/api/v1        |
| Health     | http://localhost:4000/api/v1/health |
| MySQL      | localhost:3306 (root / root)        |
| phpMyAdmin | http://localhost:8080               |

**AI is optional.** Without `AI_API_KEY` in `apps/backend/.env`, everything works and every message is a template.
With a key, pick the model in **Settings**.

Production mode on one server: `docker compose -f docker-compose.prod.yml up --build -d`. To run one app only, or
without Docker, see the [backend](apps/backend/README.md) and [frontend](apps/frontend/README.md) READMEs.

## How to review

Sample B at the reference date `2026-11-13` should give **18 stalled** candidates and **11 row errors**.

**In the web app**

1. Open http://localhost:3000 and click **Start: import a board**.
2. Use **Download sample CSV** (Sample B), then upload it with the date `2026-11-13`.
3. **Follow-ups:** check the counts, the bottlenecks, the ranked queue and the row errors. Click a row to see its
   reason, action and message.
4. **AI insights:** with a key, the briefing and messages are labelled **AI draft**. Turn AI off in **Settings** to
   see the templates.
5. **Export:** download the CSV and open it in a spreadsheet.
6. **Stages:** change a threshold and see the queue change.

**With the API** (copy `response.import.id` from the upload answer into `ID`)

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

-   Uploading the same file again returns the first import (`alreadyImported: true`).
-   `insights` makes **one** AI call per board; asking again uses the saved answer. After a failure, send
    `"retry": true` to ask again.
-   The export never calls the AI: each row uses the saved AI message for its action, or its template.

Every endpoint, with sample answers and error codes, is in the [API reference](apps/backend/API.md).

## Tests

```bash
cd apps/backend
yarn install
docker compose up db -d
yarn lint
yarn test
```

`yarn test` runs the unit and integration tests against a separate `stallalert_test` database. The pipeline tests must
match `data/expected/*.json` exactly. No test calls a real AI. Measured speed with 10,000 rows is in the
[backend README](apps/backend/README.md#speed-10000-rows-measured).

## Deploy to production

In production each part can run on its own server, built from its own Dockerfile.

| Part     | Runs on                                 | Settings                                                                                    |
| -------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Database | A managed MySQL 8 (for example AWS RDS) | Back it up; the API creates its tables                                                      |
| API      | `apps/backend/Dockerfile`               | `NODE_ENV=production`, `MYSQL_*`, `AI_API_KEY` (secret), `WEB_ORIGIN=https://<web address>` |
| Web app  | `apps/frontend/Dockerfile` (or Vercel)  | `NEXT_PUBLIC_API_URL`, set when the image is built                                          |

```bash
docker build -t stallalert-api apps/backend
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 -t stallalert-web apps/frontend
```

Put both behind HTTPS. Keep `AI_API_KEY` in the server's secret store, never in an image or in git.

## Privacy

The AI only gets ranks, day counts, action codes and keys like `R1`: never names, candidate IDs, roles, stage names,
dates or CSV text. Names are filled into the messages after the AI answers. All sample data is fictional.

## Known limits

This is a local, single-user assessment build with fictional data. Before a public launch with real hiring data it
would need:

-   **Login and roles**, so only the right people see or change a team's imports and settings.
-   **One shared store** (for example Redis) if the API runs as several copies. Today the settings, the model list and
    "one AI call at a time" live in the memory of one API process.
-   **AI spending limits** per team (today: rate limits per IP, and one call per board).
-   **Data retention rules**: imports stay until someone deletes them.

The AI checks are limited safeguards, not proof that a message is true, so every AI text is labelled
**AI draft · review before use**.

## License

MIT, see [LICENSE](LICENSE).

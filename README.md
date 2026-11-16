# StallAlert

A tool for recruiters. Upload a hiring-board CSV, and StallAlert finds candidates who have stayed in a stage too long,
ranks who to follow up first, and gives each one a reason, an action and a ready-to-send message.

**Code decides, AI only writes.** Code decides who is stalled, the order, the action and who the message goes to, with
tests. The AI (OpenRouter) only writes the briefing and message drafts for the top 5. Every AI answer is checked by
code, and any problem falls back to template messages.

Five-day assessment, Option C (Stall Alerter). Built AI-first.

## Status

| Part                       | State                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| Backend API                | Done: upload, validation, ranking, hiring stages, settings, AI insights with checks, export |
| Frontend (`apps/frontend`) | Not built yet                                                                               |

## Repository

| Path                           | What                                                                  |
| ------------------------------ | --------------------------------------------------------------------- |
| `apps/backend`                 | Express + TypeScript + MySQL 8 API ([README](apps/backend/README.md)) |
| `apps/frontend`                | Next.js app (not built yet)                                           |
| `data/sample-*.csv`            | Fictional sample files A, B and C                                     |
| `data/expected/*.json`         | Expected results for the samples                                      |
| `scripts/generate_expected.py` | Makes the expected results, written separately from the app (Python)  |
| `directive.md`                 | The rules the app is built from, with a changelog                     |
| `PROPOSAL.md`                  | The product proposal                                                  |

## Run it (fresh clone)

You need Docker. Node 22 and Yarn are only needed to run the tests on your machine.

```bash
cd apps/backend
cp .env.example .env
docker compose up
```

This starts MySQL, creates the database, runs the migrations and the seed (10 default hiring stages), then starts the
API at http://localhost:4000/api/v1. Check it with http://localhost:4000/api/v1/health.

**AI is optional.** Without `AI_API_KEY` in `.env`, everything works and every message is a template. To get AI
drafts, put an OpenRouter key in `AI_API_KEY` and restart. The model is picked in the settings (default
`inclusionai/ling-3.2-flash:free`); `GET /settings/models` lists the choices.

## Demo with Sample B (API)

Run these from the repository root. Sample B at reference date `2026-11-13` should give **18 stalled** candidates and
**11 row errors**. On a fresh database the import ID is `1`; otherwise use `response.import.id` from the upload answer.

```bash
curl -F file=@data/sample-b.csv -F referenceDate=2026-11-13 http://localhost:4000/api/v1/imports
```

```bash
curl "http://localhost:4000/api/v1/imports/1/errors?referenceDate=2026-11-13"
```

```bash
curl -X POST -H "Content-Type: application/json" -d '{"referenceDate":"2026-11-13"}' http://localhost:4000/api/v1/imports/1/insights
```

```bash
curl -o stallalert.csv "http://localhost:4000/api/v1/imports/1/export?referenceDate=2026-11-13"
```

1. The upload answers with the counts, the bottlenecks and the ranked queue. Uploading the same file again returns the
   first import (`alreadyImported: true`).
2. `errors` lists every bad row with its record number, field and problem.
3. `insights` writes the briefing and AI drafts for the top 5. With a key this makes **one** AI call; asking again
   uses the saved answer. Without a key, or if the AI fails, you get templates and `aiStatus` says why. A failed try
   is not repeated on its own: send `"retry": true` to ask the AI again.
4. The CSV has every stalled candidate. Ranks 1 to 5 use the AI drafts, the rest use templates (`ai_note_status`).

To see the template fallback with a key set, turn AI off and ask again:

```bash
curl -X PUT -H "Content-Type: application/json" -d '{"useAiDrafts":false,"aiModel":"inclusionai/ling-3.2-flash:free"}' http://localhost:4000/api/v1/settings
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

-   **Login and roles**, so only the right people see or change a team's imports and settings.
-   **One shared store** (for example Redis) if the API runs as several copies. Today the settings, the model list and
    "one AI call at a time" live in the memory of one API process.
-   **AI spending limits** per team (today: rate limits per IP, and one call per report).
-   **Data retention rules**: imports stay until someone deletes them.

Also good to know:

-   The AI checks are limited safeguards, not a proof that a draft is true. Every AI draft is labelled
    **AI draft · review before use**.
-   The model list is cached for 30 minutes. If OpenRouter cannot be reached, the last saved list is shown.
-   A database set up before migration names lost their `.ts` ending needs a one-time rename of its `migrations` and
    `seeders` rows. A fresh clone does not.

## License

MIT, see [LICENSE](LICENSE).

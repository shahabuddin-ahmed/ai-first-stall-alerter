# Directive: StallAlert

> The rules the AI coding agent builds from. When the output is wrong, I fix **this file first** and regenerate;
> I don't hand-patch code. Every change gets a line in the changelog. `PROPOSAL.md` has the same rules for human
> readers; if they ever differ, this file wins.
>
> Labels: **[Brief]** = mandated by the assessment. **[Decision]** = my implementation choice, with its reason.
>
> Version: v5

---

## Part A: What and why

### A1. The brief
- **[Brief]** "Build one small tool in 5 days, working AI-first."
- **[Brief]** Option C: "Reads a CSV of a hiring board, finds candidates who have not moved for a set number of days,
  and lists who to follow up first and what to do."

### A2. The product
StallAlert is a web app for recruiters. They upload a hiring-board CSV. The app validates it, explains every bad row,
finds applications that have stayed in a stage longer than that stage allows, and ranks who to follow up first, each
with a factual reason, an approved action and a ready-to-send message addressed to whoever has to act. When AI is
switched on, the top alerts get an AI-written draft instead of the template, labelled **AI draft · review before use**.
The queue can be exported as CSV.

### A3. Users
| User | Need |
|---|---|
| Recruiter or coordinator | "Who should I chase today, and what exactly should I send?" |
| Hiring lead | "Where is the pipeline stuck: which stage, which recruiter?" |
| Assessment reviewer | Reproduce the results; check the rules, tests and AI-first evidence |

### A4. The two AI layers
| Layer | What | How |
|---|---|---|
| **1. Build with AI** | The tool is built AI-first | AI coding assistants; each day logged honestly (prompts, what was accepted, rejected, corrected) |
| **2. AI inside the tool** | The LLM writes message text around facts code has already computed | One HTTP call (axios) to an OpenAI-compatible endpoint (OpenRouter), backend only |

### A5. The golden rule [Decision]
**Code decides, AI only writes.** Code decides who is stalled, the rank, the action, the recipient, the counts and the
bottlenecks, exactly and with tests. The LLM only writes the briefing, bottleneck notes and message drafts. It never
sees names, IDs, roles or any free text, and every output is checked before anyone sees it.

### A6. Definition of done
1. Samples A, B and C produce **exactly** the committed expected results (`data/expected/*.json`), in both scenarios.
2. A bad file never crashes the app. Every bad row shows its record number, field and fix.
3. Every alert has a usable message. With AI on and working, the top 5 get validated AI drafts; with AI off, not set up
   or failing, the template is used and labelled as such.
4. The LLM payload contains only the allowlisted facts (Part E3); a test asserts this.
5. **Build gate (end of Day 3):** in the browser, upload Sample B, verify the expected queue, generate one real AI
   briefing plus 5 drafts, download the CSV; repeat with the provider unavailable.
6. A 10,000-row file meets the targets in Part I3, with real timings recorded.
7. A reviewer can run the app from a fresh clone with the README.
8. All 7 submission deliverables are attached (Part K).

### A7. Out of scope (deliberately)
Login and roles, multi-tenant, ATS integrations, sending messages, candidate scoring or hiring decisions, LLM tool
calls, chat, message queues, Redis, microservices, real candidate data.

---

## Part B: Stack and architecture

### B1. Stack [Decision]
| Part | Choice | Reason |
|---|---|---|
| Backend | My Express + TypeScript boilerplate (`apps/backend`), clean layers | Known and proven; baseline commit `e90ed03` |
| Rules engine | Pure TypeScript pipeline files in `src/service` (`pipeline-csv`, `pipeline-analysis`, `pipeline-messages`, `pipeline-types`), no framework, DB, network or clock | Deterministic, unit-testable |
| Database | **MySQL 8** + Sequelize (from the boilerplate), utf8mb4; `candidate_id` uses `utf8mb4_bin` | Already set up; relational data with unique keys and cascades |
| Validation | Joi (the boilerplate's request validation) | Already in place |
| AI | One provider adapter (axios through the shared `utils/http` helper) to an OpenAI-compatible endpoint (OpenRouter by default), JSON-schema response format, Joi answer check | One prompt, one JSON; no SDK to keep compatible |
| Frontend | My Next.js + TypeScript boilerplate (`apps/frontend`), display only (**not built yet**) | Known and proven |
| Tests | Jest + supertest (backend, real MySQL test database), `scripts/generate_expected.py` (independent expected results). Planned: Playwright (E2E, with the frontend) and an eval script | |

**Not used:** Redis, queues, microservices, Kubernetes. One API process with a clean core is the right size.
Redis would only be needed if the API ran as several copies (README "next steps").

### B2. Backend layers (mapped to the boilerplate)
```
web/        routers, controllers (Joi validation), middleware (upload, errors, rate limits)   ← presentation
service/    use cases: import · config (stages + settings) · insight · export                 ← application
            pipeline-csv · pipeline-analysis · pipeline-messages · pipeline-types: pure rules
            ai.ts (answer checks, model list) · ai-provider.ts (OpenRouter chat + model list)
repo/       Sequelize repositories: queries only (imports, records, stages, settings, ai insights,
            llm calls, ai models)                                                             ← infrastructure
model/      Sequelize models
constant/   fixed values and enums, the AI prompt and response schema
utils/      dates, http (shared axios client), hashing
infra/      MySQL connection, migrations, seeders, logger
```

### B3. Architecture decisions
| # | Decision | Reason |
|---|---|---|
| AD1 | Store only the **8 known CSV columns** per record plus record number and field count; ignored columns are never stored | Recalculation needs them; keep nothing else |
| AD2 | Validation and ranking are **recomputed** on every request; the queue is never stored | Results depend on the reference date and stage setup |
| AD3 | **Hiring stages are configuration, not code** (Part C2), seeded with defaults | Every company names, orders and times its stages differently |
| AD4 | The domain never reads the clock, DB or network | Exact, repeatable tests |
| AD5 | LLM input keyed by **rank**, drafts keyed by **action code**; the server maps them back to candidates | The model cannot invent a candidate |
| AD6 | The LLM receives **fixed action codes**, never stage names, action text, names or any free text | Privacy and no prompt-injection path |
| AD7 | Messages go to **whoever has to act** (recipient per action code) | A message that carries out the action |
| AD8 | Every LLM output is validated; any failure → template for that report | The app never depends on the LLM |
| AD9 | AI on/off and the **AI model** are team settings in the DB (the model is picked from the provider's list); the key and URL stay in `.env` | Secrets never in the DB or the API; the team can change the model without a deploy |
| AD10 | Stages and settings cached **in memory, write-through**; the model list cached in memory for 30 minutes and saved in `ai_models` (used when the provider list cannot be loaded) | No DB read per request; no Redis |
| AD11 | Duplicate uploads stopped by a **UNIQUE file hash** in MySQL (insert, catch duplicate, return existing) | Safe even for simultaneous uploads |

---

## Part C: Domain rules

### C1. CSV contract
| Column | Required | Rule |
|---|---|---|
| `candidate_id` | Yes | Non-empty, unique after trimming, case-sensitive text, leading zeros kept |
| `name` | Yes | Non-empty |
| `role` | Yes | Non-empty |
| `stage` | Yes | A stage **name or alias** from the hiring stages, matched case-insensitively after trimming and collapsing spaces |
| `stage_entered_at` | Yes | Real `YYYY-MM-DD`, not after the reference date |
| `recruiter` | Yes | Non-empty |
| `last_activity_at` | No | Real `YYYY-MM-DD`, not after the reference date. The last real step (interview held, assessment submitted, offer sent). |
| `last_contacted_at` | No | Real `YYYY-MM-DD`, not after the reference date. Information only. |

Parsing: UTF-8, optional BOM, one header row, headers matched exactly after trimming, columns in any order, extra
columns ignored and not stored, blank records ignored, RFC 4180 quoting, LF or CRLF, headers and values trimmed (also inside quotes). Only `YYYY-MM-DD`
counts as a date. Record numbers count the header as 1. A blank header is an extra column (ignored), because
spreadsheets often add a trailing comma.

### C2. Hiring stages (configurable) [Decision]
Each stage has: **name** (unique, 1–30 letters, digits, spaces, dashes), **type** (`watched` | `paused` | `final`),
**threshold** in days (watched only, 1–90), **position** (pipeline order; later = more urgent), **aliases** (other names
in CSVs, up to 10), and a **follow-up action** chosen from a fixed list. Up to 30 stages.

**Default stages (seeded):**
| # | Stage | Type | Threshold | Aliases | Action code | Message goes to |
|---|---|---|---|---|---|---|
| 1 | Applied | watched | 5 | New, Sourced | `REVIEW_APPLICATION` | Hiring manager |
| 2 | Screening | watched | 7 | Phone screen, HR screen | `SCHEDULE_SCREEN` | Candidate |
| 3 | Interview | watched | 14 | Onsite, Panel interview | `REQUEST_FEEDBACK` | Interview panel |
| 4 | Assessment | watched | 7 | Take-home | `REVIEW_ASSESSMENT` | Assessment reviewer |
| 5 | Reference check | watched | 5 | References | `CHASE_REFERENCES` | Candidate |
| 6 | Offer | watched | 3 | – | `CONFIRM_OFFER` | Candidate |
| 7 | On hold | paused | – | Paused | – | – |
| 8–10 | Hired, Rejected, Withdrawn | final | – | Withdrawn: Declined | – | – |

`GENERIC_FOLLOW_UP` (to the candidate) is available for new stages. Paused and final stages are valid but never
queued; paused rows are counted as "On hold". Saving requires at least one watched stage and unique names/aliases,
and the current stages `version` (an old version gets 409, so two saves cannot overwrite each other).

### C3. Stall rule
- **Timer start** = the later of `stage_entered_at` and `last_activity_at` (an activity date earlier than
  `stage_entered_at` belongs to an older stage and is ignored). `last_contacted_at` never resets the timer.
- `days = dayNumber(reference) − dayNumber(timer start)`, with `dayNumber = Date.UTC(y, m−1, d) / 86_400_000`.
  Never `new Date("YYYY-MM-DD")`. Same day = 0; DST has no effect.
- **Stalled** when `days ≥ stage threshold`. `overdue = days − stage threshold`.
- The reference date defaults to today (client local date), may be earlier, never later.

### C4. Ranking
1. `overdue` descending
2. Later pipeline position first
3. `candidate_id` ascending by plain code-unit comparison

Ranks are assigned before any filter and never change with filters or sorting. Row order in the CSV has no effect.

### C5. Reason, action and template message
- **Reason:** `{name} has been in {stage} for {days} days with no recorded activity. The {stage} threshold is {t} days,
  so the application is {overdue} days overdue. {recruiter} should {action}.` When the timer started at
  `last_activity_at`: `…has had no activity in {stage} since {date} ({days} days)…`. "1 day" for one.
- **Action labels:** Review the application · Schedule a screening call · Request interview feedback · Review the
  assessment · Chase references · Confirm the offer decision · General follow-up.
- **Template messages** (always available; the fallback whenever AI is not used). They carry out the action, address the
  recipient, and make no promises or claims the CSV does not support:

| Action | Template |
|---|---|
| `REVIEW_APPLICATION` | Hi, could you review {name}'s application for the {role} role? It needs a decision on the next step. Thanks, {recruiter} |
| `SCHEDULE_SCREEN` | Hi {first_name}, thank you for your interest in the {role} position. I would like to schedule a short screening call. Could you share a few times that suit you? Best regards, {recruiter} |
| `REQUEST_FEEDBACK` | Hi team, could you share your interview feedback on {name} for the {role} role? We need it to decide the next step. Thanks, {recruiter} |
| `REVIEW_ASSESSMENT` | Hi, could you review {name}'s assessment for the {role} role and share your result? Thanks, {recruiter} |
| `CHASE_REFERENCES` | Hi {first_name}, we are still waiting on your references for the {role} position. Could you check that your referees have received our request? Best regards, {recruiter} |
| `CONFIRM_OFFER` | Hi {first_name}, I am following up on the offer for the {role} position. Please let me know your decision or any questions you have. Best regards, {recruiter} |
| `GENERIC_FOLLOW_UP` | Hi {first_name}, I am following up on your application for the {role} position. Best regards, {recruiter} |

### C6. Bottlenecks (computed by code)
The stage with the most stalled (ties → later position) and the recruiter with the most stalled (ties → name
ascending), each shown only if its count ≥ 2.

### C7. Validation
**File errors** reject the whole file; nothing is stored; the previous queue and AI text are cleared:
`FILE_TOO_LARGE` (413, > 5 MB) · `UNSUPPORTED_FILE` (415) · `INVALID_ENCODING` · `EMPTY_FILE` · `TOO_MANY_ROWS`
(> 10,000) · `MISSING_HEADERS` (lists them) · `DUPLICATE_HEADERS` · `INVALID_CSV` (with the line) · `VALUE_TOO_LONG` (a known
text column over its limit: `candidate_id` 36, `name` 50, `role` 50, `stage` 30, `recruiter` 50; with the record and
column) — 422 unless noted.

**Row errors** exclude the record; the rest still rank; the excluded count is shown. A record lists every error but
counts once as invalid: field count differs · required value missing · date not a real `YYYY-MM-DD` · date after the
reference date · stage not in the hiring stages ("add it, or add it as an alias") · duplicate `candidate_id` (every copy; lists up to 5 other records, then "and N more").
A record with the wrong field count gets only that error and is left out of the duplicate-ID check: its columns may be
shifted, so its ID cannot be trusted (same rule in `scripts/generate_expected.py`). Row error details come from
`GET /imports/:id/errors`; the upload answer has the counts.

### C8. Export
- Columns: `rank, candidate_id, name, role, stage, recruiter, reference_date, stage_threshold, timer_from,
  days_in_stage, overdue_days, reason, action, message_to, message_draft, message_source, ai_note_status`
- `message_draft` is always filled (AI draft or template); `message_source` = `ai_draft` | `template`.
- AI drafts are used for ranks 1…N only, the same as the insights screen; every other row uses its template.
- `ai_note_status`: `ai_draft` · `disabled` (team setting off) · `not_in_top_n` (rank above N, template used) ·
  `pending` (no AI answer for this report yet) · `unavailable` (not set up on the server, the last call failed, or no
  draft for that action).
- RFC 4180 escaping; **formula guard**: text starting with `=`, `+`, `-`, `@`, tab or CR gets a `'` prefix.
- Follows the current view and order, keeps original ranks, works while AI is pending or failed.

---

## Part D: Acceptance data

Committed: `data/sample-a.csv`, `data/sample-b.csv`, `data/sample-c.csv` and `data/expected/*.json`, generated by
`scripts/generate_expected.py` (Python, written separately from the app). Each expected file has two scenarios at reference
date 2026-11-13: **`default_stages`** and **`all_thresholds_7`** (every watched stage at 7 days).

| Sample | Proves | Default stages | All thresholds 7 |
|---|---|---|---|
| **A** (6 rows) | Basic ranking, terminal stage, boundary | 3 stalled: `001 → 003 → 006` | 4 stalled: `001 → 003 → 006 → 002` (the v2 verified result) |
| **B** (43 rows) | 11 planted row errors, boundaries, ties, normalised stages, leading zero, quoted comma, contact ignored | 32 valid, 11 invalid, **18 stalled**: `127, 104, 108, 101, 125, 0142, 122, 137, 110, 135, 105, 114, 124, 131, 121, 111, 103, 139`; bottlenecks Offer (5), Recruiter A (7) | **20 stalled**, identical to the v2 hand-checked queue |
| **C** (8 rows) | `last_activity_at` resets the timer, earlier activity ignored, future/invalid activity dates are errors, aliases, On hold | 6 valid, 2 invalid, 1 on hold, 3 stalled: `c02 → c03 → c08` | see the JSON |

Sample B row errors (records, header = 1): 3, 16, 17, 19, 20, 21, 27, 29, 30, 37, 42 — details in the JSON.
Regenerate from the repo root with `python3 scripts/generate_expected.py --write`; any difference from the app is a bug in one of them.

---

## Part E: AI layer

### E1. When AI runs
AI runs only when **both**: the server has `AI_API_KEY` (`.env`) **and** the team setting **Use AI drafts** is on
(Settings page, stored in the DB). The **model** is also a team setting: picked from `GET /settings/models` (OpenRouter
models that support structured outputs), saved in the DB, default `inclusionai/ling-3.2-flash:free`. A model that is
not in the list is rejected. One provider call per distinct report (import + reference date + stage config version + N
+ prompt version + model); repeats come from the cache; simultaneous requests share one call (the cache lookup and the
call run as one step). Zero calls when AI is off or not set up, the file is rejected, nothing is stalled, or the user filters,
sorts or exports. No automatic retries; a **Retry** button for recoverable failures. `/insights` is rate-limited.

### E2. Backend `.env` (server setup and secrets only)
`AI_API_KEY` · `AI_BASE_URL` (default OpenRouter) · `AI_TOP_N` (default 5) · `AI_TIMEOUT_MS` (15000) ·
`AI_MAX_OUTPUT_TOKENS` (1500) · `AI_REASONING_EFFORT` (`low`) · `MYSQL_*` · `WEB_ORIGIN` · `RATE_LIMIT_*`. Validated at
startup. The model is not in `.env` (E1). An empty key = templates only.

### E3. Facts sent (allowlist, nothing else)
Per rank 1…N: `rank`, `action_code`, `stage_threshold`, `days_in_stage`, `overdue_days`, `days_since_contact` or null,
`recipient_type`, `recruiter_key` (R1…). Board: totals, stalled by action code, stalled by recruiter key (top 5 +
others), bottlenecks (type, then the action code for a stage or the recruiter key for a recruiter, and the count).
**Never sent:** names, candidate IDs, roles, recruiter names, stage names, action text, file name,
reference date, raw CSV. A test asserts the exact key set and that the serialized prompt is ≤ 8 KiB at 10,000 rows.

### E4. Output and guardrails
- Schema: `briefing` (≤ 450 chars), `bottleneck_notes[]` (one per supplied bottleneck, ≤ 220), `drafts[]` (one per
  action code in `board.stalled_by_action`, ≤ 600). A draft is used for every top-N alert with that action. Drafts use
  only `{{first_name}}`, `{{name}}`, `{{role}}`, `{{recruiter}}`, filled on the server.
- Drafts address the action's recipient and carry out the action; no dates, digits, links, markup, promises of timing,
  guesses about why it stalled, or judgements of the candidate.
- Checks after generation, by code: shape (every action exactly once, no unknown action), lengths, allowed placeholders,
  `{{recruiter}}` only once (the signature), no broken placeholders, **right recipient** (`{{first_name}}` and no
  `{{name}}` for the candidate; `{{name}}` and no `{{first_name}}` for anyone else), no digits and **no timing words**
  in drafts (weekdays, months except "May", today, tomorrow, tonight, this week, next week), no action codes in text,
  numbers in the briefing and notes must exist in the facts, no URLs/HTML/markdown links. Any failure → the whole
  report uses templates.
- These checks are **limited safeguards**, not a proof that a draft is true. They catch the shape, placeholders,
  recipient, numbers, links and common timing words, but not every unsupported claim (for example "your offer is
  approved"). So code keeps every decision (who, rank, action, recipient, counts), and every AI draft stays labelled
  **AI draft · review before use** for a person to check before sending.
- Cache only validated, unfilled output; fill names for the current report on every hit; never cache failures.

### E5. Testing the AI layer
A mock AI provider in tests (no real calls in CI). Cases: valid, missing/duplicate/unknown action, too long, digits,
timing words, wrong recipient, URL, bad placeholder, timeout, refusal, provider errors (rate limit, auth, no credits),
no key, setting off, cache hit (0 calls), simultaneous requests and a slow cache lookup (1 call), a failure is not repeated until Retry,
a new model (new call). Day 1 smoke test with a real key. **Not built yet:** the manual `npm run eval` on fictional
cases (target ≥ 95% guardrail pass, defects and fixes logged).

---

## Part F: API (base `/api/v1`)
| Method | Path | Does |
|---|---|---|
| POST | `/imports` | Upload CSV (`file`) + `referenceDate` → counts, bottlenecks, stage thresholds, first queue page. 201 new; 200 with `alreadyImported: true` for the same file |
| GET | `/imports?offset=&limit=` | List imports, newest first |
| GET | `/imports/:id?referenceDate=&stage=&recruiter=&search=&page=&pageSize=` | Recalculate; no re-upload. Filters keep the original ranks |
| GET | `/imports/:id/errors?referenceDate=&page=&pageSize=` | Row errors: record number, candidate ID, field, problem |
| POST | `/imports/:id/insights` | Briefing, bottleneck notes and AI drafts for the top N (or templates, with the reason) |
| GET | `/imports/:id/export?referenceDate=&stage=&recruiter=&search=` | CSV download (C8); never calls the AI |
| DELETE | `/imports/:id` | Delete the import, its rows and cached AI results (the AI call log is kept) |
| GET · PUT | `/stages` | Read or save the hiring stages (PUT needs the current `version`, else 409) |
| GET · PUT | `/settings` | Read or save `useAiDrafts` and `aiModel`; shows whether AI is set up (never the key) |
| GET | `/settings/models` | Models the team can pick (cached 30 minutes, saved in the DB) |
| GET | `/health` | API and database status (200 or 503) |

Errors: `{ code, message, response: null, errors: [...] }` with the codes in C7, `E_INVALID_DATA` (400),
`E_NOT_FOUND` (404), `E_CONFLICT` (409), `E_PAYLOAD_TOO_LARGE` (413) or `E_TOO_MANY_REQUESTS` (429).
Uploads and `/insights` are rate-limited per IP.

---

## Part G: Storage (MySQL 8)
Every table has `id`, `created_at` and `updated_at`. Tables come from migrations (one file per table), never from
`sequelize.sync()`; the API refuses to start while a migration is pending. History tables: `migrations`, `seeders`
(names stored without the `.ts`/`.js` ending, so the dev setup and the built app agree).

| Table | Contents |
|---|---|
| `imports` | file_name, file_hash (UNIQUE), file_size, header_count, record_count |
| `import_records` | import_id (FK cascade), record_number (UNIQUE per import), field_count, the 8 known columns (text columns with C7 limits, dates as `DATE`), `invalid_dates` (JSON: which date columns held text that is not a date) |
| `stages` | name (UNIQUE), type, threshold_days, position (UNIQUE), aliases (JSON), action_code |
| `settings` | use_ai_drafts, ai_model, stages_version (the stages `version`) |
| `ai_insights` | import_id (FK cascade), cache_key (UNIQUE), model, prompt_version, unfilled output with drafts by action (JSON) |
| `llm_calls` | import_id (FK set null), cache_key, requested/served model, tokens, cost, latency, status, error code (never text) |
| `ai_models` | model_id (UNIQUE), name, context_length: the last model list from the provider |

**Duplicate uploads:** insert the import in a transaction; on the UNIQUE `file_hash` conflict, roll back and return the
existing import with `alreadyImported: true`. Never "check then insert". A concurrency test uploads the same file twice
in parallel and expects one row and one shared ID.

---

## Part H: Frontend (Next.js, display only)
**Status: not built yet** (`apps/frontend` is empty). This part is the plan.

- **Shell:** full-height sidebar (Workspace: Follow-ups, Imports, Export; Configure: Hiring stages, Settings), top bar
  with the board picker, New import and help, slim footer `StallAlert 1.0 · API healthy · Docs · Privacy`.
- **Screens:** Import · Follow-ups (counts, stage thresholds, insights panel, ranked queue with AI/Template badges, row
  details with reason, action, timer start and the message with its recipient, Row errors tab) · Export · Hiring stages ·
  Settings.
- **Inline states** (not pages): file rejected (on Import), no valid rows, nobody stalled ("lower a stage threshold"),
  AI unavailable (banner + Retry; templates used), same file uploaded again.
- **Copy** shows "Copied" only after the clipboard write succeeds, otherwise "Copy failed, select the text".
- Stale AI responses are discarded when the import, date or stage config changes; old AI text is hidden behind
  **Refresh AI insights**.
- Keyboard accessible, visible focus, `aria-live` for counts and AI status, colour never the only signal, works at 375 px.

---

## Part I: Quality, security, performance
- **I1 Tests:** domain unit tests against all three expected files and both scenarios; repo and API tests (supertest,
  MySQL); AI tests (E5); the concurrency test (G). Planned: a Playwright flow for the build gate, with the frontend.
- **I2 Security:** upload size/type/row limits; Joi validation; CORS to the web origin; rate limit on `/insights`;
  parameterised queries only; formula guard; secrets only in `.env`; no stack traces, candidate data or AI answer text in logs;
  `.env` never copied into a Docker image; no auth
  (single-user, local, fictional data) stated as a known limit.
- **I3 Performance (measure, never invent):** 10,000 rows → queue ≤ 3 s; recalculation ≤ 300 ms; insights ≤ 15 s (cache hit
  ≤ 200 ms); prompt ≤ 8 KiB. Three runs per size, the bottleneck and before/after numbers recorded.

---

## Part J: Build plan and scope
| Priority | Scope |
|---|---|
| **P0** | CSV parse/validate, default stages (seeded), per-stage thresholds, `last_activity_at` timer, ranking, reasons, templates, AI insights with guardrails and template fallback, team AI setting, export, duplicate-upload handling, Follow-ups/Import/Export/Settings screens |
| **P1** | Hiring stages page: edit thresholds; Imports list |
| **P2** | Aliases editing, reorder and add stages, choosing action codes per stage, map unknown stages during import |

| Day | Work | Exit |
|---|---|---|
| 1 | Spec, fixtures + expected-results script, repo, boilerplates, AI smoke test | Expected results committed; smoke test logged |
| 2 | Domain rules (tests first) + import API with MySQL | Samples A/B/C match through the API |
| 3 | Next.js screens, insights + guardrails + fallback, export | **Build gate** (A6.5) passes |
| 4 | Load ladder, concurrency test, reliability; P1 if on track | Real timings recorded |
| 5 | Clean-clone check, README, eval, `unlearned.md`, both videos, submit | All deliverables attached |

**Cut order if late:** P2 → P1 → Swagger/docs polish. **Never cut:** rules + tests, validation, AI guardrails and
fallback, export, the build gate, the deliverables.

---

## Part K: Submission
The 7 deliverables: Quest Loom (≤ 5 min) · `intent.md` · final `directive.md` · working code + README · five daily
logs · one-page `unlearned.md` · Career Path & Career Leverage video (≤ 5 min). Fictional data only. The assessment
invitation is the authority for formats and deadlines.

---

## Part M: How the AI coding agent should work

1. Read this file before every task. If code and this file disagree, this file wins.
2. Write the tests first, from Parts C and D, then the code. The expected results in `data/expected/*.json` come from
   `scripts/generate_expected.py`; never edit them by hand and never change a rule or an expected result just to make a test pass.
3. Build in the order of Part J and run the tests after each step.
4. If a rule here is unclear or seems wrong, stop and say so. Don't guess silently.
5. Keep each change small enough to review in under two minutes, one feature per commit.
6. Never send candidate names, IDs, roles, stage names or any free text to the LLM; never log prompts, responses,
   file contents or rows; never commit `.env` or real data.
7. Don't add dependencies, services or infrastructure (queues, Redis, extra services) that aren't in Part B without asking.
8. Follow the boilerplates' conventions (folders, naming, error responses, test style): controller → service → repo,
   repos only run queries, try/catch only when an error leads to another action. Keep the pipeline files
   (`src/service/pipeline-*.ts`) free of Express, Sequelize, the AI adapter and the clock.

---

## Changelog
- **v1 (Day 1):** CLI with per-stage limits, `>` boundary and a weighted score.
- **v2 (Day 1):** browser-only, no backend, no in-app AI, after cross-checking against the brief and a second model's review.
- **v3:** full stack. NestJS + PostgreSQL/Prisma + React/shadcn + an in-app LLM layer (Vercel AI SDK, structured
  output, guardrails, fallback, cache, eval). Raw records stored so validation can be recomputed. Follow-up status added.
  *Reason:* "what to do" is where an LLM adds real value, as long as it is guarded and the rules stay in charge of
  who is stalled and in what order. A backend is then needed for the AI key, cache and follow-ups. The stack uses
  tools I already know well, so the five days go into the product rather than into learning a framework.
- **v3.1:** merged an independent model review. LLM I/O keyed by rank. No IDs, roles or free text sent (placeholders
  filled on the server). Digit, URL and markup checks. Stale-response protection. AI toggle and data-use note.
  `ai_note_status` in the export. One call per report with no hidden retries. A record with several errors counts
  once. Headers matched exactly. Default N = 10. A storage interface with in-memory first.
  *Reason:* the review found a smaller data boundary and stale-response gaps, and the in-memory-first storage
  protects the schedule. Kept from v3: Sample B with full expected results, provider-agnostic AI, the richer AI
  output, the rule-based fallback content.
- **v3.2:** my own Next.js and Node.js boilerplates (upgraded on Day 1, disclosed in the README), clean layered
  architecture, MySQL 8. Merged a second review: Day 3 browser gate, MySQL and follow-ups as stretch work, only known
  columns stored, data notice, follow-ups scoped per import, a cache safe under concurrency and retries, narrower AI
  output (briefing, bottleneck notes, drafts; no model urgency or actions), code-computed bottlenecks, top 5,
  a prompt-size test at 10k rows, `ai_message_draft` in the export, committed expected-result files, AI SDK 6
  (`generateText` + `Output.object`), and a Day 1 smoke test.
  *Reason:* boilerplates I already maintain save setup time; the review found real gaps (what the server keeps,
  cache safety, export mismatch, a deprecated SDK call) and moved the end-to-end proof earlier.
- **v3.3:** PostgreSQL 16 as the database (the team's stack; MySQL 8 as the Day 1 fallback). OpenRouter through the
  AI SDK provider, with the model chosen by the eval, routing preferences, served model and cost recorded per call,
  and a mapping of provider errors to the fallback.
  *Reason:* matching the team's database makes the code easier to review. OpenRouter gives one integration for a
  measured model choice, and only anonymised facts are sent.
  Product renamed from StallWatch to **StallAlert** (matches the brief's "Stall alerter", easier to say); repository `stallalert-ai-first-quest`.
- **v3.4:** template messages for every alert (one per stage), used as the fallback when the model is down, rejected or
  switched off. Export gets `message_draft` (always filled) and `message_source`.
  *Reason:* a recruiter must always get a usable message, even during an outage, and the action (internal step) and the
  message (to the candidate) are now clearly separate.
- **v4:** Express + MySQL boilerplate (Sequelize, Joi); configurable hiring stages with per-stage thresholds (defaults
  Applied 5, Screening 7, Interview 14, Assessment 7, Reference check 5, Offer 3); optional `last_activity_at` resets the
  timer; messages go to whoever has to act; the LLM receives fixed action codes only; 8 stored columns; AI on/off is a
  team setting in the DB; write-through config cache and no Redis; duplicate uploads via a UNIQUE file hash; Sample C
  and two-scenario expected results from an independent script; P0/P1/P2 scope.
  *Reason:* real hiring stages take very different times and differ by company; the second model review found message,
  privacy and copy issues; the build gate needs committed fixtures with independently computed results.
- **v5:** the directive now matches the shipped backend. The AI model is a team setting in the DB, picked from the
  provider's model list (cached 30 minutes, saved in `ai_models`); `AI_MODEL` and `AI_MODE` left `.env`, and the fake
  provider is gone (tests use a mock). Drafts are keyed by action code and used for the top N on the screen and in the
  export (`not_in_top_n` for the rest). New code checks: right recipient and no timing words. The cache lookup and the
  AI call run as one step. Migration names are stored without the file ending. The rules live in
  `src/service/pipeline-*.ts`; the AI code is `ai.ts` + `ai-provider.ts` over a shared axios helper. Stage names up to
  30 characters; text columns have their own limits. The Applied wording left the `REVIEW_APPLICATION` template.
  Frontend, Playwright and the eval script are marked as not built yet.
  *Reason:* an independent review ran the API end to end and found real gaps (built app saw pending migrations,
  screen and export disagreed on AI drafts, a draft to the wrong person passed, a slow cache lookup allowed a second
  call); the model choice belongs to the team, not the deploy; the spec must describe what ships.
- **v5.1:** a second review. Headers and values are trimmed inside quotes too (matches the expected-results script).
  `PROMPT_VERSION` v6, so AI answers saved under the old checks are asked again. A duplicate-ID error lists up to 5
  other records, then "and N more" (10,000 copies of one ID took 2.2 s and 562 MB of error text; now 19 ms).
  Placeholders are filled in one pass as plain text. A failed save of the AI call log or answer keeps the answer.
  Logs hold only the number of AI problems, never the text. `yarn start` and the production image run the built code
  (`db:migrate:prod`, `db:seed:prod`), and `.env` is kept out of Docker images. AI checks described as limited
  safeguards. Kept as is: the 30-minute model list cache with the `ai_models` fallback.
  *Reason:* each was a real gap found by reading the code; the model-list case is rare and already has a fallback.

# StallAlert API

Base URL: `http://localhost:4000/api/v1`

The samples below are real answers from the local API with Sample B (`data/sample-b.csv`) and the reference date
`2026-11-13`. Long lists are shortened to their first items.

## Contents

-   [Basics](#basics): response format, IDs, dates, limits, errors
-   [Health](#health): `GET /health`
-   [Hiring stages](#hiring-stages): `GET /stages`, `PUT /stages`
-   [Settings](#settings): `GET /settings`, `PUT /settings`, `GET /settings/models`
-   [Imports](#imports): `POST /imports`, `GET /imports`, `GET /imports/:id`, `GET /imports/:id/errors`,
    `DELETE /imports/:id`
-   [AI insights](#ai-insights): `POST /imports/:id/insights`
-   [Export](#export): `GET /imports/:id/export`
-   [Error codes](#error-codes)

## Basics

### Response format

Every JSON answer has the same four fields.

```json
{
    "code": "SUCCESS",
    "message": "Success",
    "response": {},
    "errors": []
}
```

| Field      | What it is                                                                    |
| ---------- | ----------------------------------------------------------------------------- |
| `code`     | `SUCCESS`, or an [error code](#error-codes)                                   |
| `message`  | A short sentence for people                                                   |
| `response` | The data. `null` on an error                                                  |
| `errors`   | Empty on success. On an error, one line per problem (for example, each field) |

### IDs

An import ID is a random UUID (v4), for example `fe09c220-c555-4b56-a087-fe6577664eea`. Any other value gets
`400 E_INVALID_DATA`. The database number IDs never leave the server.

### Reference date

`referenceDate` is the day the board is checked against (`YYYY-MM-DD`). Days in stage and overdue days are counted up
to that date. If it is left out, the server's today is used.

### Pages

Lists with `page` and `pageSize` start at page 1. `pageSize` is 50 by default and at most 200. The import list uses
`offset` and `limit` instead (25 by default, at most 100).

### Limits

| What               | Limit                                     | Answer when passed        |
| ------------------ | ----------------------------------------- | ------------------------- |
| CSV upload         | 5 MB, 10,000 rows, `.csv` only            | `413` / `422` / `415`     |
| JSON body          | 100 KB                                    | `413 E_PAYLOAD_TOO_LARGE` |
| Uploads per IP     | 20 per minute (`RATE_LIMIT_UPLOADS_...`)  | `429 E_TOO_MANY_REQUESTS` |
| AI insights per IP | 10 per minute (`RATE_LIMIT_INSIGHTS_...`) | `429 E_TOO_MANY_REQUESTS` |

### Headers

-   Every answer has an `X-Request-Id` header. Send your own (8 to 64 letters, digits or dashes) to follow a request in
    the logs.
-   Browsers can call the API only from `WEB_ORIGIN` (CORS).

---

## Health

### `GET /health`

Checks the API and the database.

```bash
curl http://localhost:4000/api/v1/health
```

**200 OK**

```json
{
    "code": "SUCCESS",
    "message": "StallAlert API is healthy",
    "response": { "service": "stallalert-api", "status": "ok", "database": "up" },
    "errors": []
}
```

When the database cannot be reached, the answer is **503** with `code: "E_SERVICE_UNAVAILABLE"`,
`status: "degraded"` and `database: "down"`.

---

## Hiring stages

Stages decide who is stalled. Each stage has a type:

| `type`    | Meaning                                                                 |
| --------- | ----------------------------------------------------------------------- |
| `watched` | Has a threshold in days. Longer than that means stalled                 |
| `paused`  | On hold. Never stalled (`thresholdDays` is `null`)                      |
| `final`   | Hired, rejected or withdrawn. Never stalled (`thresholdDays` is `null`) |

### `GET /stages`

Returns the stages in order, the current `version`, and the actions a stage can use.

```bash
curl http://localhost:4000/api/v1/stages
```

**200 OK** (shortened: 2 of 10 stages, 2 of 7 actions)

```json
{
    "code": "SUCCESS",
    "message": "Success",
    "response": {
        "version": 2,
        "stages": [
            {
                "name": "Screening",
                "type": "watched",
                "thresholdDays": 7,
                "position": 1,
                "aliases": ["Phone screen", "HR screen"],
                "actionCode": "SCHEDULE_SCREEN",
                "actionLabel": "Schedule a screening call",
                "recipient": "candidate"
            },
            {
                "name": "Applied",
                "type": "watched",
                "thresholdDays": 5,
                "position": 2,
                "aliases": ["New", "Sourced"],
                "actionCode": "REVIEW_APPLICATION",
                "actionLabel": "Review the application",
                "recipient": "hiring_manager"
            }
        ],
        "actions": [
            { "code": "REVIEW_APPLICATION", "label": "Review the application", "recipient": "hiring_manager" },
            { "code": "SCHEDULE_SCREEN", "label": "Schedule a screening call", "recipient": "candidate" }
        ]
    },
    "errors": []
}
```

Action codes: `REVIEW_APPLICATION`, `SCHEDULE_SCREEN`, `REQUEST_FEEDBACK`, `REVIEW_ASSESSMENT`, `CHASE_REFERENCES`,
`CONFIRM_OFFER`, `GENERIC_FOLLOW_UP`. Recipients: `hiring_manager`, `candidate`, `interview_panel`,
`assessment_reviewer`.

### `PUT /stages`

Replaces the whole list. The order of the array is the stage order. Send the `version` you loaded: if someone saved in
the meantime, the answer is `409` and nothing changes. A save makes `version` go up by 1.

| Field                    | Rules                                                             |
| ------------------------ | ----------------------------------------------------------------- |
| `version`                | Required. The `version` from `GET /stages`                        |
| `stages`                 | Required. 1 or more stages                                        |
| `stages[].name`          | Required. Up to 30 letters, digits, spaces or dashes              |
| `stages[].type`          | Required. `watched`, `paused` or `final`                          |
| `stages[].thresholdDays` | 1 to 90 for `watched`, `null` otherwise                           |
| `stages[].aliases`       | Other names the CSV may use for this stage (same rules as `name`) |
| `stages[].actionCode`    | One of the action codes above, or `null`                          |

```bash
curl -X PUT http://localhost:4000/api/v1/stages \
  -H "Content-Type: application/json" \
  -d '{
    "version": 2,
    "stages": [
      { "name": "Screening", "type": "watched", "thresholdDays": 7, "aliases": ["Phone screen"], "actionCode": "SCHEDULE_SCREEN" },
      { "name": "Hired", "type": "final", "thresholdDays": null, "aliases": [], "actionCode": null }
    ]
  }'
```

**200 OK**: the same shape as `GET /stages`, with the new `version`.

**409 Conflict** (the `version` is old)

```json
{
    "code": "E_CONFLICT",
    "message": "The data changed since you loaded it. Reload and try again.",
    "response": null,
    "errors": ["The hiring stages were changed by someone else. Reload the page and try again."]
}
```

---

## Settings

### `GET /settings`

```bash
curl http://localhost:4000/api/v1/settings
```

**200 OK**

```json
{
    "code": "SUCCESS",
    "message": "Success",
    "response": {
        "status": 1,
        "aiConfigured": true,
        "aiModel": "deepseek/deepseek-v4-flash-0731",
        "stagesVersion": 2
    },
    "errors": []
}
```

| Field           | Meaning                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| `status`        | `1` = use AI drafts, `0` = templates only                                |
| `aiConfigured`  | `true` when the server has an `AI_API_KEY`. The key itself is never sent |
| `aiModel`       | The OpenRouter model ID used for AI calls                                |
| `stagesVersion` | The current stages version                                               |

### `PUT /settings`

| Field     | Rules                                            |
| --------- | ------------------------------------------------ |
| `status`  | Required. The number `0` or `1`                  |
| `aiModel` | Required. A model ID from `GET /settings/models` |

```bash
curl -X PUT http://localhost:4000/api/v1/settings \
  -H "Content-Type: application/json" \
  -d '{"status": 0, "aiModel": "deepseek/deepseek-v4-flash-0731"}'
```

**200 OK**: the same shape as `GET /settings`.

**400 Bad Request**

```json
{
    "code": "E_INVALID_DATA",
    "message": "Please provide valid data",
    "response": null,
    "errors": ["\"status\" must be one of [0, 1]", "\"aiModel\" is required"]
}
```

A model ID that OpenRouter does not list also gets `400`: `"<id>" is not an available AI model.`

### `GET /settings/models`

The models you can pick. The list comes from OpenRouter and is kept in memory for 1 day. Prices are US dollars per
1 million tokens; `null` means the price varies.

```bash
curl http://localhost:4000/api/v1/settings/models
```

**200 OK** (shortened: 2 models)

```json
{
    "code": "SUCCESS",
    "message": "Success",
    "response": [
        {
            "modelId": "tencent/hy4-flash",
            "name": "Tencent: Hy4 flash",
            "contextLength": 1048576,
            "inputPrice": 0.035,
            "outputPrice": 0.1405
        },
        {
            "modelId": "qwen/qwen4-max",
            "name": "Qwen: Qwen4 Max",
            "contextLength": 1000000,
            "inputPrice": 1.425,
            "outputPrice": 4.275
        }
    ],
    "errors": []
}
```

If OpenRouter cannot be reached: **503** `E_SERVICE_UNAVAILABLE`,
`"The AI model list could not be loaded from OpenRouter. Try again later."`

---

## Imports

### `POST /imports`

Uploads a CSV (`multipart/form-data`) and returns the analysed board. Nothing is saved when the file is rejected.
Uploading the same file again (same content) returns the first import with `alreadyImported: true` and **200**
instead of **201**.

| Field                | Rules                                                        |
| -------------------- | ------------------------------------------------------------ |
| `file`               | Required. A `.csv` file, UTF-8, up to 5 MB and 10,000 rows   |
| `referenceDate`      | Optional. `YYYY-MM-DD`                                       |
| `stage`, `recruiter` | Optional. Filter the queue                                   |
| `search`             | Optional. Search name or candidate ID (up to 100 characters) |
| `page`, `pageSize`   | Optional. Page of the queue                                  |

Required CSV columns: `candidate_id`, `name`, `role`, `stage`, `stage_entered_at`, `recruiter`. Optional:
`last_contacted_at`, `last_activity_at`.

```bash
curl -F file=@data/sample-b.csv -F referenceDate=2026-11-13 http://localhost:4000/api/v1/imports
```

**201 Created** (new file) or **200 OK** (same file again). The `queue` is shortened to 1 item.

```json
{
    "code": "SUCCESS",
    "message": "Success",
    "response": {
        "alreadyImported": true,
        "import": {
            "id": "fe09c220-c555-4b56-a087-fe6577664eea",
            "fileName": "sample-board.csv",
            "fileSize": 2994,
            "recordCount": 43,
            "createdAt": "2026-11-17T06:49:25.000Z"
        },
        "referenceDate": "2026-11-13",
        "stagesVersion": 2,
        "counts": {
            "total": 43,
            "valid": 32,
            "invalid": 11,
            "terminal": 5,
            "onHold": 0,
            "stalled": 18,
            "notStalled": 9
        },
        "bottlenecks": [
            { "type": "stage", "key": "Offer", "stalled": 5 },
            { "type": "recruiter", "key": "Recruiter A", "stalled": 7 }
        ],
        "stageThresholds": [
            { "name": "Screening", "thresholdDays": 7, "stalled": 3 },
            { "name": "Applied", "thresholdDays": 5, "stalled": 5 },
            { "name": "Assessment", "thresholdDays": 7, "stalled": 3 },
            { "name": "Interview", "thresholdDays": 14, "stalled": 2 },
            { "name": "Reference check", "thresholdDays": 5, "stalled": 0 },
            { "name": "Offer", "thresholdDays": 3, "stalled": 5 }
        ],
        "filterOptions": {
            "stages": ["Applied", "Screening", "Offer", "Interview", "Assessment"],
            "recruiters": ["Recruiter A", "Recruiter B", "Recruiter C"]
        },
        "queue": {
            "items": [
                {
                    "rank": 1,
                    "recordNumber": 28,
                    "candidateId": "127",
                    "name": "Hana Novak",
                    "firstName": "Hana",
                    "role": "Product Designer",
                    "stage": "Applied",
                    "stagePosition": 2,
                    "stageStep": 2,
                    "stageSteps": 6,
                    "recruiter": "Recruiter C",
                    "timerFrom": "2026-10-10",
                    "timerSource": "stage_entered_at",
                    "daysInStage": 34,
                    "stageThreshold": 5,
                    "overdueDays": 29,
                    "lastContactedAt": null,
                    "daysSinceContact": null,
                    "actionCode": "REVIEW_APPLICATION",
                    "actionLabel": "Review the application",
                    "recipient": "hiring_manager",
                    "reason": "Hana Novak has been in Applied for 34 days with no recorded activity. The Applied threshold is 5 days, so the application is 29 days overdue. Recruiter C should review the application.",
                    "templateMessage": "Hi, could you review Hana Novak's application for the Product Designer role? It needs a decision on the next step. Thanks, Recruiter C"
                }
            ],
            "page": 1,
            "pageSize": 50,
            "total": 18
        }
    },
    "errors": []
}
```

| Field             | Meaning                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `counts`          | `valid` + `invalid` = `total`. Valid rows are `terminal`, `onHold`, `stalled` or `notStalled` |
| `bottlenecks`     | The stage and the recruiter with the most stalled candidates                                  |
| `stageThresholds` | Each watched stage, its threshold and how many are stalled there                              |
| `filterOptions`   | Values you can send as `stage` and `recruiter`                                                |
| `queue.items`     | Stalled candidates, most urgent first (`rank` 1). The order is decided by code, not the AI    |
| `timerSource`     | Which date the days are counted from: `stage_entered_at` or `last_activity_at`                |
| `stageStep`       | The stage's place among the watched stages (`stageStep` of `stageSteps`)                      |
| `templateMessage` | The ready-to-send template message. AI drafts come from [insights](#ai-insights)              |

**File errors** (nothing is saved)

```json
{
    "code": "MISSING_HEADERS",
    "message": "Required columns are missing: role, stage, stage_entered_at, recruiter.",
    "response": null,
    "errors": ["role", "stage", "stage_entered_at", "recruiter"]
}
```

```json
{
    "code": "UNSUPPORTED_FILE",
    "message": "Upload a .csv file (CSV UTF-8).",
    "response": null,
    "errors": ["Upload a .csv file (CSV UTF-8)."]
}
```

No file at all: **400** `E_INVALID_DATA`, `errors: ["Choose a CSV file to upload"]`. The other file errors are in
[Error codes](#error-codes).

### `GET /imports`

Lists the imports, newest first.

| Query    | Rules                           |
| -------- | ------------------------------- |
| `offset` | Optional. 0 or more (default 0) |
| `limit`  | Optional. 1 to 100 (default 25) |

```bash
curl "http://localhost:4000/api/v1/imports?limit=2"
```

**200 OK**

```json
{
    "code": "SUCCESS",
    "message": "Success",
    "response": {
        "data": [
            {
                "id": "da158efb-2a60-488c-9af5-0d955da14e1e",
                "fileName": "sample-board-500-valid.csv",
                "fileSize": 40688,
                "recordCount": 500,
                "createdAt": "2026-11-17T08:44:27.000Z"
            },
            {
                "id": "fe09c220-c555-4b56-a087-fe6577664eea",
                "fileName": "sample-board.csv",
                "fileSize": 2994,
                "recordCount": 43,
                "createdAt": "2026-11-17T06:49:25.000Z"
            }
        ],
        "offset": 0,
        "limit": 2,
        "total": 2
    },
    "errors": []
}
```

### `GET /imports/:id`

Recalculates a saved board for a date, with the current stages. Same answer as the upload, without
`alreadyImported`.

| Query                          | Rules                      |
| ------------------------------ | -------------------------- |
| `referenceDate`                | Optional. `YYYY-MM-DD`     |
| `stage`, `recruiter`, `search` | Optional. Filter the queue |
| `page`, `pageSize`             | Optional                   |

```bash
curl "http://localhost:4000/api/v1/imports/$ID?referenceDate=2026-11-13&recruiter=Recruiter%20A&page=1&pageSize=20"
```

**200 OK**: see [`POST /imports`](#post-imports).

**400 Bad Request** (the ID is not a UUID)

```json
{
    "code": "E_INVALID_DATA",
    "message": "Please provide valid data",
    "response": null,
    "errors": ["\"id\" must be a valid GUID"]
}
```

**404 Not Found** (no import has this ID, or it was deleted)

```json
{
    "code": "E_NOT_FOUND",
    "message": "Import not found",
    "response": null,
    "errors": ["Import not found"]
}
```

### `GET /imports/:id/errors`

The rows that could not be used, with the record number, the field and the problem.

| Query              | Rules                                                        |
| ------------------ | ------------------------------------------------------------ |
| `referenceDate`    | Optional. `YYYY-MM-DD` (a future date is checked against it) |
| `page`, `pageSize` | Optional                                                     |

```bash
curl "http://localhost:4000/api/v1/imports/$ID/errors?referenceDate=2026-11-13&pageSize=2"
```

**200 OK**

```json
{
    "code": "SUCCESS",
    "message": "Success",
    "response": {
        "import": {
            "id": "fe09c220-c555-4b56-a087-fe6577664eea",
            "fileName": "sample-board.csv",
            "fileSize": 2994,
            "recordCount": 43,
            "createdAt": "2026-11-17T06:49:25.000Z"
        },
        "referenceDate": "2026-11-13",
        "items": [
            {
                "recordNumber": 3,
                "candidateId": "102",
                "errors": [
                    { "field": "candidate_id", "code": "DUPLICATE_ID", "problem": "duplicate ID (also record 21)" }
                ]
            },
            {
                "recordNumber": 16,
                "candidateId": "115",
                "errors": [{ "field": "stage_entered_at", "code": "MISSING_VALUE", "problem": "missing value" }]
            }
        ],
        "page": 1,
        "pageSize": 2,
        "total": 11
    },
    "errors": []
}
```

Row error codes: `FIELD_COUNT` (wrong number of fields), `MISSING_VALUE`, `INVALID_DATE`, `FUTURE_DATE`,
`UNKNOWN_STAGE` and `DUPLICATE_ID`.

### `DELETE /imports/:id`

Deletes the import, its rows and its saved AI answers.

```bash
curl -X DELETE http://localhost:4000/api/v1/imports/$ID
```

**200 OK**

```json
{ "code": "SUCCESS", "message": "Success", "response": { "deleted": true }, "errors": [] }
```

**404** `E_NOT_FOUND` when the import does not exist.

---

## AI insights

### `POST /imports/:id/insights`

Returns the briefing, one note per bottleneck, and one message per follow-up action in the queue.

-   **One AI call per board.** The first request for an import, date and stages version calls the AI once. The answer
    is saved, so later requests use it (`cached: true`) and cost nothing.
-   **Templates when the AI is not used.** AI turned off, no key, nobody stalled, or the AI failed: the answer has the
    same shape, with template texts.
-   **A failure is remembered.** After a failed call, the AI is asked again only when you send `"retry": true`.
-   **Each part is checked by code.** A part that fails the checks uses its template; the other parts stay AI.

| Field           | Rules                                                  |
| --------------- | ------------------------------------------------------ |
| `referenceDate` | Optional. `YYYY-MM-DD`                                 |
| `retry`         | Optional. `true` asks the AI again after a failed call |

```bash
curl -X POST http://localhost:4000/api/v1/imports/$ID/insights \
  -H "Content-Type: application/json" \
  -d '{"referenceDate": "2026-11-13"}'
```

**200 OK** (AI turned off, so every text is a template)

```json
{
    "code": "SUCCESS",
    "message": "Success",
    "response": {
        "referenceDate": "2026-11-13",
        "aiStatus": "disabled",
        "errorCode": null,
        "model": "deepseek/deepseek-v4-flash-0731",
        "cached": false,
        "topN": 5,
        "briefing": {
            "text": "18 of 32 valid candidates are past their stage threshold. Start with Hana Novak (Applied, 29 days overdue). Most stalled candidates are in Offer (5). Recruiter A has the most follow-ups (7).",
            "source": "template"
        },
        "bottleneckNotes": [
            {
                "type": "stage",
                "key": "Offer",
                "stalled": 5,
                "text": "Offer has 5 stalled candidates. Clear these follow-ups first.",
                "source": "template"
            },
            {
                "type": "recruiter",
                "key": "Recruiter A",
                "stalled": 7,
                "text": "Recruiter A owns 7 stalled follow-ups. Consider sharing some of them.",
                "source": "template"
            }
        ],
        "actionMessages": []
    },
    "errors": []
}
```

With AI drafts, `aiStatus` is `ai_draft`, the texts have `source: "ai_draft"`, and `actionMessages` has one message
per action code in the queue:

```json
"actionMessages": [
    {
        "actionCode": "REVIEW_APPLICATION",
        "text": "Hi, could you review {{name}}'s application for the {{role}} role and share the next step? Thanks, {{recruiter}}"
    }
]
```

The client fills the placeholders for each row: `{{first_name}}` (messages to the candidate), `{{name}}` (messages
to anyone else), `{{role}}` and `{{recruiter}}`. The AI never sees names or candidate IDs.

| Field       | Meaning                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aiStatus`  | `ai_draft`, `disabled` (AI off), `not_configured` (no key), `nothing_stalled`, `failed`                                                                     |
| `errorCode` | When `failed`: `TIMEOUT`, `RATE_LIMITED`, `AUTH_FAILED`, `NO_CREDITS`, `PROVIDER_ERROR`, `CONNECTION_FAILED`, `REFUSED`, `INVALID_JSON` or `INVALID_OUTPUT` |
| `cached`    | `true` when the saved answer was used (no AI call)                                                                                                          |
| `topN`      | How many top alerts the briefing looks at (`AI_TOP_N`)                                                                                                      |
| `source`    | Per text: `ai_draft` or `template`                                                                                                                          |

**404** `E_NOT_FOUND` when the import does not exist. **429** after 10 requests a minute from one IP.

---

## Export

### `GET /imports/:id/export`

Downloads every stalled candidate as CSV. It never calls the AI: each row uses the saved AI message for its action, or
its template.

| Query                          | Rules                               |
| ------------------------------ | ----------------------------------- |
| `referenceDate`                | Optional. `YYYY-MM-DD`              |
| `stage`, `recruiter`, `search` | Optional. Same filters as the queue |

```bash
curl -o stallalert.csv "http://localhost:4000/api/v1/imports/$ID/export?referenceDate=2026-11-13"
```

**200 OK**

```http
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="stallalert-2026-11-13-fe09c220.csv"
Cache-Control: no-store
```

```csv
rank,candidate_id,name,role,stage,recruiter,reference_date,stage_threshold,timer_from,days_in_stage,overdue_days,reason,action,message_to,message_draft,message_source,ai_note_status
1,127,Hana Novak,Product Designer,Applied,Recruiter C,2026-11-13,5,2026-10-10,34,29,"Hana Novak has been in Applied for 34 days with no recorded activity. The Applied threshold is 5 days, so the application is 29 days overdue. Recruiter C should review the application.",Review the application,Hiring manager,"Hi, could you review Hana Novak's application for the Product Designer role? It needs a decision on the next step. Thanks, Recruiter C",template,pending
```

-   The file starts with a UTF-8 BOM, so Excel shows the text correctly.
-   `message_source` is `ai_draft` or `template`.
-   `ai_note_status`: `ai_draft` (AI message used), `pending` (insights not made yet for this date), `unavailable`
    (the last AI call failed) or `disabled` (AI off).
-   Values that a spreadsheet could run as a formula (starting with `=`, `+`, `-`, `@`, a tab or a carriage return)
    get a `'` in front.

---

## Error codes

| HTTP | `code`                    | When                                                          |
| ---- | ------------------------- | ------------------------------------------------------------- |
| 400  | `E_INVALID_DATA`          | A field, query value or ID is wrong. `errors` lists each one  |
| 404  | `E_NOT_FOUND`             | The import does not exist                                     |
| 404  | `E_PAGE_NOT_FOUND`        | The endpoint does not exist                                   |
| 409  | `E_CONFLICT`              | The stages were saved by someone else (old `version`)         |
| 413  | `E_PAYLOAD_TOO_LARGE`     | The JSON body is larger than 100 KB                           |
| 413  | `FILE_TOO_LARGE`          | The CSV is larger than 5 MB                                   |
| 415  | `UNSUPPORTED_FILE`        | The file is not a `.csv`                                      |
| 422  | `EMPTY_FILE`              | The CSV is empty                                              |
| 422  | `INVALID_ENCODING`        | The CSV is not UTF-8                                          |
| 422  | `MISSING_HEADERS`         | Required columns are missing. `errors` lists them             |
| 422  | `DUPLICATE_HEADERS`       | A column name appears twice                                   |
| 422  | `INVALID_CSV`             | The file cannot be read as CSV                                |
| 422  | `TOO_MANY_ROWS`           | More than 10,000 rows                                         |
| 422  | `VALUE_TOO_LONG`          | A value is longer than its column allows                      |
| 429  | `E_TOO_MANY_REQUESTS`     | Too many uploads or insights requests from one IP this minute |
| 500  | `E_INTERNAL_SERVER_ERROR` | Something broke on the server. Details are only in the logs   |
| 503  | `E_SERVICE_UNAVAILABLE`   | The database or the OpenRouter model list cannot be reached   |

# ERD

The database schema as built by the migrations in `apps/backend/src/infra/migrations`. MySQL 8, `utf8mb4`. Every
table also has `created_at` and `updated_at`.

![StallAlert database schema](mermaid-diagram.png)

## Diagram (Mermaid source)

```mermaid
erDiagram
    IMPORTS ||--o{ IMPORT_RECORDS : "has rows"
    IMPORTS ||--o{ AI_INSIGHTS : "has saved AI answers"
    IMPORTS |o--o{ LLM_CALLS : "has AI call logs"

    IMPORTS {
        int id PK "internal, never sent by the API"
        char public_id UK "UUID v4, used by the API"
        varchar file_name
        varchar file_hash UK "same file is stored once"
        int file_size "bytes"
        smallint header_count
        int record_count
    }

    IMPORT_RECORDS {
        int id PK
        int import_id FK
        int record_number "header = 1, unique per import"
        smallint field_count
        varchar candidate_id "up to 36"
        varchar name "up to 50"
        varchar role "up to 50"
        varchar stage "up to 30"
        date stage_entered_at
        varchar recruiter "up to 50"
        date last_activity_at
        date last_contacted_at
        json invalid_dates "dates that could not be read"
    }

    AI_INSIGHTS {
        int id PK
        int import_id FK
        varchar cache_key UK "hash of import, date, stages version, top N, prompt, model"
        varchar model
        varchar prompt_version
        json output "briefing, notes, one message per action"
    }

    LLM_CALLS {
        int id PK
        int import_id FK "null after the import is deleted"
        varchar cache_key
        varchar requested_model
        varchar served_model
        int input_tokens
        int output_tokens
        decimal cost_usd
        int latency_ms
        enum status "success, failed"
        varchar error_code "TIMEOUT, RATE_LIMITED, ..."
    }

    STAGES {
        int id PK
        varchar name UK "up to 30"
        enum type "watched, paused, final"
        smallint threshold_days "watched only, 1 to 90"
        smallint position UK "stage order"
        json aliases "other names in CSV files"
        enum action_code "watched only"
    }

    SETTINGS {
        int id PK
        tinyint status "1 = AI drafts on, 0 = templates only"
        varchar ai_model "OpenRouter model ID"
        int stages_version "goes up on each stages save"
    }
```

`STAGES` and `SETTINGS` stand alone: they are the configuration every board is checked against, not data of one
import.

## Tables

| Table            | What it stores                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `imports`        | One uploaded CSV file. The unique `file_hash` makes a second upload of the same file return the first import |
| `import_records` | The rows of a file, as read. Wrong dates are kept in `invalid_dates`, so row errors can be shown later       |
| `ai_insights`    | Checked AI answers with placeholders, never names. One per `cache_key`, so a board calls the AI once         |
| `llm_calls`      | One row per AI call: model, tokens, cost, time and status. Never the prompt or the answer text               |
| `stages`         | The hiring stages: type, threshold, order, aliases and the follow-up action                                  |
| `settings`       | One row: AI drafts on or off, the AI model, and the stages version                                           |

## Rules

| Rule                                                       | How                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Deleting an import deletes its rows and saved AI answers   | `ON DELETE CASCADE` on `import_records` and `ai_insights`                                                                 |
| AI call logs outlive the import (for cost history)         | `ON DELETE SET NULL` on `llm_calls.import_id`                                                                             |
| The same file is stored once, even for two uploads at once | Unique `file_hash`; the insert decides, never "check then insert"                                                         |
| One row number per import                                  | Unique (`import_id`, `record_number`)                                                                                     |
| Stage names and order are unique                           | Unique `name` and `position`                                                                                              |
| Old saved AI answers are never reused after a change       | `cache_key` is a hash of the import, the reference date, the stages version, `AI_TOP_N`, the prompt version and the model |
| The API never shows the number ID                          | Unique `public_id` (UUID v4); the API looks imports up by it                                                              |

The stalled queue, ranks and messages are **not stored**: they are recalculated from `import_records` and `stages` on
each request (49 ms for 10,000 rows), so a change to a threshold shows at once.

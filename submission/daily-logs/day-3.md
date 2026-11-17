# Day 3 · Sunday 15 November 2026 · Real coding: the backend

## Goal

Build the backend features from the locked plan, each one verified and tested before the next.

## What I did

Started in **plan mode with Claude Code**: a 7-step backend plan, one branch per step (`feature/<name>` from
`develop`), each with a clear "done when" check:

1. Database tables and migrations · 2. Rules (no database, no AI) · 3. Hiring stages and settings · 4. Upload and
queue · 5. AI messages · 6. Export · 7. Hardening (lint, input checks, security, speed with 10,000 rows, Docker).

The working rule for every step: Claude Code writes the code and the tests and runs them; I check it, then I commit
and merge. Coded all day like this: build, verify, feedback, test, merge. One feature per pull request:

| PR  | Feature                                                                                    |
| --- | ------------------------------------------------------------------------------------------ |
| #1  | Backend setup, configuration and health check                                              |
| #2  | Sample CSVs A, B, C and `scripts/generate_expected.py` (expected results, written apart from the app) |
| #3  | Database schema with migrations                                                            |
| #4  | Rules: row checks and stage matching, tests first                                          |
| #5  | Hiring stages and settings                                                                 |
| #6  | CSV upload API: limits, clear file errors, the same file twice returns the first import    |
| #7  | AI insights: one OpenRouter call, checks, template fallback, call log                      |
| #8  | CSV export, protected against spreadsheet formulas                                         |
| #9  | Hardening: security headers, CORS, rate limits, safe logs                                  |

## How I used AI

-   **Claude Code** wrote the code and the tests from the directive, one plan step at a time, following my own
    boilerplate's style (router → controller → service → repo → model).
-   I reviewed every change by hand, gave feedback, and ran the tests before merging. Claude Code never commits; I
    do.
-   **A fresh check after each feature, or each group of features:** I opened a new session with a different model
    (Codex or ChatGPT) and asked it to verify the work against the directive. A new session has none of the
    builder's context, so it checks the code as it really is.
-   The "done when" checks kept each step honest, for example "Sample B through the API gives 18 stalled and 11
    errors, and a double upload gives one import".
-   The expected results come from a separate Python script, so a test can never be "fixed" by changing the expected
    answer (directive Part M, rule 2).

## End of day

Every planned backend feature was built and merged. Reviewing the whole backend is next.

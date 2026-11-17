# Day 4 · Monday 16 November 2026 · Review the whole backend, start the frontend

## Goal

Make the backend solid before building screens on it, then start the frontend.

## What I did

**Most of the day: reviewed the whole backend**, by hand and in **fresh sessions** with Codex, ChatGPT and Claude,
each checking the full backend on its own. The reviews ran the API end to end and found real bugs, all fixed the same
day (directive v5 and v5.1):

-   the built app saw pending migrations;
-   the screen and the export disagreed on which messages were AI drafts;
-   a message addressed to the wrong person passed the checks;
-   a slow cache lookup let a second AI call through;
-   10,000 copies of one candidate ID took 2.2 s and 562 MB of error text (now 19 ms).

I also removed the fake AI mode (tests use a mock), added checks for the right recipient and for timing words, and
added more unit tests.

**2 to 3 hours on the frontend:** finished the Next.js boilerplate and started coding. A few phases went in: Imports,
Follow-ups with filters and pages, AI insights with **Retry AI**, and Export. The screens worked end to end but were
still rough, so Day 5 was set aside for the UI pass.

## How I used AI

-   Reviewed the code myself, by hand, and opened a **new session for each reviewer model** (Codex, ChatGPT, Claude),
    so none of them carried the builder's context. I asked them to run the API, not only read the code; that found
    more than reading alone.
-   Turned each finding into a directive change first, then had Claude Code regenerate the code.
-   Used Claude Code to set up the frontend on my own Next.js pattern (App Router, Redux Toolkit, Tailwind) and
    start the screens.

## Accepted, rejected, corrected

| Finding or suggestion                         | What I did   | Why                                                              |
| --------------------------------------------- | ------------ | ---------------------------------------------------------------- |
| A message to the wrong person passed          | Corrected    | New "right recipient" check                                      |
| A fake AI mode for demos                      | Removed      | Tests use a mock; the demo uses the real AI or templates         |
| A failed AI call was paid again on every visit | Corrected (v5.2) | The failure is remembered; only **Retry AI** calls again     |

## End of day

The backend is reviewed and fixed. The frontend exists but needs a lot of work, so Day 5 starts with the UI.

# StallAlert frontend (`apps/frontend`)

Next.js (App Router) web app for StallAlert. Recruiters upload a hiring-board CSV, see the ranked follow-up queue with
a reason, an action and a ready-to-send message for each stalled candidate, and export it as CSV. It talks to the API
in `apps/backend` ([API reference](../backend/API.md)).

## Stack

| Part      | What                                                                                 |
| --------- | ------------------------------------------------------------------------------------ |
| Framework | Next.js 16 (App Router), React 19, TypeScript 6                                      |
| Styling   | Tailwind CSS 4, shadcn-style parts on Radix UI (`radix-ui`), `cn` helper             |
| State     | Redux Toolkit (the open board)                                                       |
| Other     | `react-day-picker` (calendar), `date-fns`, `lucide-react` (icons), `sonner` (toasts) |

## Run with Docker

```bash
cd apps/frontend
cp .env.example .env
docker compose up --build
```

Open http://localhost:3000. This is development mode: saving a file refreshes the page. The API must run on port 4000;
to start both together, use `docker compose up --build` in the repository root instead.

Production mode (Next.js standalone server):

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

## Run without Docker

```bash
cp .env.example .env
yarn install
yarn dev
```

## Settings (`.env`)

| Setting               | Default                        | What it does                      |
| --------------------- | ------------------------------ | --------------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | The API address the browser calls |

`NEXT_PUBLIC_*` values are put into the browser code **when the app is built**, so they are public. Never put a secret
here.

- Development reads `.env`.
- A production build reads `.env.production` (copy `.env.example` and set the real API address). The Docker build
  uses it too; a `--build-arg NEXT_PUBLIC_API_URL=...` wins over it.
- Changing the address needs a new build.

## Pages

| Page            | What it does                                                                             |
| --------------- | ---------------------------------------------------------------------------------------- |
| `/`             | Overview and the one rule: code decides, AI only writes                                  |
| `/imports`      | Upload a CSV with a reference date, help for rejected files, recent imports              |
| `/follow-ups`   | Summary, AI insights (or templates), the ranked queue with filters and pages, row errors |
| `/export`       | Preview and download the queue as CSV                                                    |
| `/stages`       | Edit hiring stages: order, type, threshold, aliases and action                           |
| `/settings`     | Turn AI drafts on or off, pick the AI model (with search and prices), stored imports     |
| `/how-it-works` | How the backend decides, stores and calls the AI                                         |

## How it works

- **The open board is in the address**, for example `/follow-ups?import=<uuid>&date=2026-11-13`, so a reload or a
  shared link opens the same board. Redux keeps the board while you move between pages.
- **Imports are opened by their UUID.** A link with a deleted import or a wrong ID shows "Import not found" with a
  way back to Imports.
- **The AI runs once when a board opens.** The answer is saved on the server, so opening it again is instant. After
  a failure, it runs again only with **Retry AI**.
- **One AI message per action.** The API returns one message per action code with placeholders; `lib/messages.ts`
  fills in each row's name, role and recruiter. Every AI text is labelled **AI draft · review before use**.
- **Queue rows open in place.** Click a row (or its arrow) to see the reason, the stage step, who it waits on, the due
  date and the message.
- **Loading and empty states** use skeletons and clear messages, and API errors show the API's own message.

## Scripts

| Command      | What it does                     |
| ------------ | -------------------------------- |
| `yarn dev`   | Start the dev server             |
| `yarn build` | Production build with type check |
| `yarn start` | Run the production build         |
| `yarn lint`  | ESLint                           |

## Folders

| Folder                  | What it holds                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `src/app`               | Pages (one folder per route), layout, global styles                                               |
| `src/features`          | The UI of one page (`imports`, `follow-ups`, `export`, `stages`, `settings`, ...)                 |
| `src/components/ui`     | Base parts: button, card, input, badge, select, popover, calendar, alert dialog, skeleton, switch |
| `src/components/layout` | App shell: sidebar, top bar, footer, reading the board from the address                           |
| `src/components/shared` | Shared parts: date picker, pager, stat card, empty, loading and "import not found" states         |
| `src/lib`               | API client (`api.ts`), board links, message placeholders, formatting, providers, `cn`             |
| `src/stores`            | Redux store and the board slice                                                                   |
| `src/hooks`             | `useApiData` (load data with loading and error state) and typed Redux hooks                       |
| `src/types`             | Shared types that match the API answers                                                           |

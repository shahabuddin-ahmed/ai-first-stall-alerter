# StallAlert frontend

Next.js (App Router) app for StallAlert. It talks to the backend in `apps/backend`.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Redux Toolkit, lucide-react.

## Run

```bash
cp .env.example .env
yarn install
yarn dev
```

Open http://localhost:3000. The backend must run on port 4000 (`NEXT_PUBLIC_API_URL`).

## Scripts

| Command | What it does |
|---|---|
| `yarn dev` | Start the dev server |
| `yarn build` | Production build with type check |
| `yarn start` | Run the production build |
| `yarn lint` | ESLint |

## Folders

| Folder | What it holds |
|---|---|
| `src/app` | Pages (one folder per route) |
| `src/features` | UI for one page |
| `src/components/ui` | Base parts: button, card, input, badge |
| `src/components/layout` | App shell: sidebar, top bar, footer |
| `src/components/shared` | Empty, loading and error states, stat card |
| `src/lib` | API client, formatting, providers, `cn` |
| `src/stores` | Redux store and slices |
| `src/hooks` | Typed Redux hooks |
| `src/types` | Shared types |

# AGENTS.md · frontend

Rules for agents working in `apps/frontend`. The root [AGENTS.md](../../AGENTS.md) and
[directive.md](../../directive.md) apply too.

## The one rule here

**The frontend only displays.** Who is stalled, the rank, the action and the messages come from the API. Never
recompute a rule in the browser.

## Structure (Next.js App Router)

| Folder                  | Put here                                                                    |
| ----------------------- | --------------------------------------------------------------------------- |
| `src/app/<route>`       | A thin `page.tsx` that renders its feature view                             |
| `src/features/<page>`   | The UI of one page, split into small components                             |
| `src/components/ui`     | Base parts in shadcn style on Radix (`radix-ui`): button, select, popover…  |
| `src/components/shared` | Parts used by several pages: date picker, pager, empty and loading states   |
| `src/components/layout` | The app shell: sidebar, top bar, footer                                     |
| `src/lib`               | `api.ts` (every API call), `board-link.ts`, `messages.ts`, formatting, `cn` |
| `src/hooks`             | `useApiData` (loading and error state) and typed Redux hooks                |
| `src/stores`            | Redux: only the open board                                                  |
| `src/types`             | Types that match the API answers                                            |

## Rules

- **All API calls go through `src/lib/api.ts`.** Show the API's own error message; on `E_NOT_FOUND` show the
  "Import not found" state.
- **The open board lives in the address** (`?import=<uuid>&date=YYYY-MM-DD`, see `lib/board-link.ts`). Import IDs
  are UUIDs only.
- **AI messages:** fill placeholders only with `lib/messages.ts`, and keep every AI text labelled
  **AI draft · review before use**. Templates are labelled as templates.
- **Styling:** Tailwind classes with `cn`; reuse `components/ui` before adding a new part; icons from `lucide-react`;
  toasts with `sonner`.
- **Accessibility:** every control has a label, works with the keyboard, and animations respect
  `prefers-reduced-motion`.
- **No secrets.** `NEXT_PUBLIC_*` values are built into the browser code and are public.
- No new packages without asking.

## Commands

| Command      | What                                 |
| ------------ | ------------------------------------ |
| `yarn dev`   | Dev server on http://localhost:3000  |
| `yarn lint`  | ESLint                               |
| `yarn build` | Production build with the type check |

The API must run on port 4000 (`NEXT_PUBLIC_API_URL`). Run `npx tsc --noEmit` and `yarn lint` after each change.

## Style

2 spaces, single quotes, no trailing commas. Format only the files you change, never the whole repository.

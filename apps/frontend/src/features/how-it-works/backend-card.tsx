import { Card } from '@/components/ui/card';

const STORAGE = [
  { what: 'Hiring stages, team settings', where: 'MySQL + a copy in memory', why: 'Read from memory on every request; a save writes MySQL and refreshes the copy at once.' },
  { what: 'Imports and their rows', where: 'MySQL (8 known columns only)', why: 'Recalculate after a date or stage change without re-uploading.' },
  { what: 'Ranked queue', where: 'Not stored', why: 'Always recalculated, so it is never out of date.' },
  { what: 'AI answers', where: 'MySQL, by cache key', why: 'One AI call per import, date, stages version and model; survives restarts.' },
  { what: 'AI call log', where: 'MySQL (no text)', why: 'Model, tokens, cost, time and status; a failed try is not repeated until Retry.' },
  { what: 'AI model list', where: 'Memory (30 min) + MySQL', why: 'Fast Settings page; the saved list is used if OpenRouter is down.' },
  { what: 'Duplicate upload', where: 'MySQL unique file hash', why: 'The same file twice, even at the same moment: one import.' }
];

const API_ROUTES = [
  { route: 'POST /imports', text: 'Upload a CSV + reference date. Returns the queue (or the existing import).' },
  { route: 'GET /imports', text: 'List stored imports.' },
  { route: 'GET /imports/:id', text: 'Recalculate with a new date or stages. Filters and pages.' },
  { route: 'GET /imports/:id/errors', text: 'Row errors, with pages.' },
  { route: 'DELETE /imports/:id', text: 'Delete the import, its rows and its AI answers.' },
  { route: 'POST /imports/:id/insights', text: 'Briefing, bottleneck notes and drafts (AI or template). retry: true asks again.' },
  { route: 'GET /imports/:id/export', text: 'Download the queue as CSV.' },
  { route: 'GET · PUT /stages', text: 'Read or save the hiring stages.' },
  { route: 'GET · PUT /settings', text: 'Read or save Use AI drafts and the model.' },
  { route: 'GET /settings/models', text: 'Models the AI can use.' },
  { route: 'GET /health', text: 'API and database status.' }
];

const ENV = [
  { key: 'AI_API_KEY', text: 'Secret. Never sent to the browser, stored in the database, or logged.' },
  { key: 'AI_BASE_URL', text: 'OpenRouter by default (any OpenAI-compatible API).' },
  { key: 'AI_TOP_N', text: 'How many top alerts the AI briefing looks at (default 5). Every alert gets an AI draft.' },
  { key: 'AI_TIMEOUT_MS', text: 'How long to wait for the AI (default 15000).' },
  { key: 'MYSQL_*', text: 'Database host, port, name, user, password.' },
  { key: 'WEB_ORIGIN', text: 'Which web app may call the API (CORS).' },
  { key: 'RATE_LIMIT_*', text: 'Uploads and AI insights per minute.' }
];

export function BackendCard() {
  return (
    <>
      <Card className="flex flex-col gap-3 p-[22px]">
        <h2 className="text-[17px] font-semibold">Data, cache and duplicates (no Redis)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-gray-600">What</th>
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-gray-600">Where</th>
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-gray-600">Why</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE.map((item) => (
                <tr key={item.what} className="border-b border-gray-100 align-top">
                  <td className="px-3 py-2.5 font-semibold">{item.what}</td>
                  <td className="px-3 py-2.5">{item.where}</td>
                  <td className="px-3 py-2.5 text-gray-700">{item.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        <Card className="flex flex-col gap-2.5 p-[22px]">
          <h2 className="text-[17px] font-semibold">API (/api/v1)</h2>
          {API_ROUTES.map((item) => (
            <div key={item.route} className="flex flex-col gap-0.5 border-b border-gray-100 pb-2">
              <span className="font-mono text-[13px] font-semibold">{item.route}</span>
              <span className="text-sm text-gray-700">{item.text}</span>
            </div>
          ))}
        </Card>
        <Card className="flex flex-col gap-2.5 p-[22px]">
          <h2 className="text-[17px] font-semibold">Backend .env (server setup and secrets only)</h2>
          {ENV.map((item) => (
            <div key={item.key} className="flex flex-col gap-0.5 border-b border-gray-100 pb-2">
              <span className="font-mono text-[13px] font-semibold">{item.key}</span>
              <span className="text-sm text-gray-700">{item.text}</span>
            </div>
          ))}
          <span className="text-[13px] text-gray-600">
            AI on/off, the model and the hiring stages are team settings in the database, edited in the app.
          </span>
        </Card>
      </div>
    </>
  );
}

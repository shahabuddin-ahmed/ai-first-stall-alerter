/*
 * Speed test with a 10,000-row board (spec I3). Talks to a running API over HTTP.
 *
 *   yarn perf                       upload, recalculate, row errors, export (no AI calls)
 *   yarn perf --insights            also AI insights: first call and cached call
 *                                   (run the API with AI_MODE=fake so no real AI is called)
 *   API_URL=http://localhost:4200/api/v1 yarn perf
 *
 * Each run uploads a different file (so it is never "already imported") and deletes it at the end.
 */
const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";
const RUNS = 3;
const ROWS = 10_000;
const REFERENCE_DATE = "2026-11-13";
const WITH_INSIGHTS = process.argv.includes("--insights");

const TARGETS_MS: Record<string, number> = {
    "upload (10,000 rows)": 3000,
    "recalculate (GET board)": 300,
    "insights, cached": 200,
};

const STAGES = ["Applied", "Screening", "Interview", "Assessment", "Reference check", "Offer", "On hold", "Hired"];

const makeBoard = (run: string): string => {
    const lines = ["candidate_id,name,role,stage,stage_entered_at,recruiter,last_activity_at,last_contacted_at"];
    for (let i = 0; i < ROWS; i += 1) {
        const month = String(1 + (i % 10)).padStart(2, "0");
        const day = String(1 + (i % 28)).padStart(2, "0");
        lines.push(`${run}-${i},Candidate ${i},Role ${i % 12},${STAGES[i % STAGES.length]},2026-${month}-${day},Recruiter ${i % 9},,`);
    }
    return lines.join("\n");
};

const timed = async <T>(work: () => Promise<T>): Promise<{ ms: number; result: T }> => {
    const startedAt = process.hrtime.bigint();
    const result = await work();
    return { ms: Number(process.hrtime.bigint() - startedAt) / 1e6, result };
};

const expectOk = async (res: Response, what: string): Promise<any> => {
    if (!res.ok) {
        throw new Error(`${what} failed: HTTP ${res.status} ${await res.text()}`);
    }
    return res.headers.get("content-type")?.includes("json") ? res.json() : res.text();
};

const main = async () => {
    const times: Record<string, number[]> = {};
    const record = (name: string, ms: number) => (times[name] ??= []).push(ms);

    for (let run = 1; run <= RUNS; run += 1) {
        const board = makeBoard(`r${Date.now()}${run}`);
        const form = new FormData();
        form.append("referenceDate", REFERENCE_DATE);
        form.append("file", new Blob([board], { type: "text/csv" }), "load-test.csv");

        const upload = await timed(async () => expectOk(await fetch(`${API_URL}/imports`, { method: "POST", body: form }), "upload"));
        record("upload (10,000 rows)", upload.ms);
        const id = upload.result.response.import.id;
        const query = `referenceDate=${REFERENCE_DATE}`;

        for (let i = 0; i < 3; i += 1) {
            record("recalculate (GET board)", (await timed(async () => expectOk(await fetch(`${API_URL}/imports/${id}?${query}`), "board"))).ms);
        }
        record("row errors (GET errors)", (await timed(async () => expectOk(await fetch(`${API_URL}/imports/${id}/errors?${query}`), "errors"))).ms);
        record("export CSV", (await timed(async () => expectOk(await fetch(`${API_URL}/imports/${id}/export?${query}`), "export"))).ms);

        if (WITH_INSIGHTS) {
            const ask = async () =>
                expectOk(
                    await fetch(`${API_URL}/imports/${id}/insights`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ referenceDate: REFERENCE_DATE }),
                    }),
                    "insights"
                );
            record("insights, first call", (await timed(ask)).ms);
            record("insights, cached", (await timed(ask)).ms);
        }

        await fetch(`${API_URL}/imports/${id}`, { method: "DELETE" });
        console.log(`run ${run}/${RUNS} done (${Buffer.byteLength(board)} bytes, stalled: ${upload.result.response.counts.stalled})`);
    }

    console.log(`\n| Step | Median | Slowest | Target | Result |\n|---|---|---|---|---|`);
    for (const [name, list] of Object.entries(times)) {
        const sorted = [...list].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const slowest = sorted[sorted.length - 1];
        const target = TARGETS_MS[name];
        const result = target === undefined ? "-" : slowest <= target ? "pass" : "FAIL";
        console.log(`| ${name} | ${median.toFixed(0)} ms | ${slowest.toFixed(0)} ms | ${target ? `≤ ${target} ms` : "-"} | ${result} |`);
    }
};

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});

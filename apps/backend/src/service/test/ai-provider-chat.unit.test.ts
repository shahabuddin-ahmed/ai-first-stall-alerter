import http from "http";
import { AddressInfo } from "net";
import { AiErrorCode, ReasoningEffort } from "../../constant/ai";
import { ActionCode, RecipientType } from "../../constant/stage";
import { InsightFacts } from "../pipeline-messages";
import { AiError, OpenRouterProvider } from "../ai-provider";
import { isTimeoutError } from "../../utils/http";

// A tiny local server stands in for OpenRouter, so no real calls are made.
type Handler = (body: any, req: http.IncomingMessage, res: http.ServerResponse) => void;

let server: http.Server;
let baseUrl: string;
let handler: Handler;
let lastRequest: { body: any; headers: http.IncomingHttpHeaders; url?: string };

beforeAll(async () => {
    server = http.createServer((req, res) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => {
            const body = data ? JSON.parse(data) : null;
            lastRequest = { body, headers: req.headers, url: req.url };
            handler(body, req, res);
        });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
});

const FACTS: InsightFacts = {
    board: {
        total: 3,
        valid: 3,
        invalid: 0,
        terminal: 0,
        on_hold: 0,
        stalled: 1,
        not_stalled: 2,
        stalled_by_action: { CONFIRM_OFFER: 1 },
        stalled_by_recruiter: [{ recruiter_key: "R1", stalled: 1 }],
        stalled_by_other_recruiters: 0,
    },
    bottlenecks: [],
    alerts: [
        {
            rank: 1,
            action_code: ActionCode.CONFIRM_OFFER,
            recipient_type: RecipientType.CANDIDATE,
            stage_threshold: 3,
            days_in_stage: 5,
            overdue_days: 2,
            days_since_contact: null,
            recruiter_key: "R1",
        },
    ],
};

const ANSWER = {
    briefing: "Start with rank 1.",
    bottleneck_notes: [],
    drafts: [{ action_code: ActionCode.CONFIRM_OFFER, text: "Hi {{first_name}}." }],
};

const generator = (timeoutMs = 2000) =>
    new OpenRouterProvider({
        apiKey: "test-key",
        baseUrl,
        timeoutMs,
        maxOutputTokens: 800,
        reasoningEffort: ReasoningEffort.LOW,
    });

const reply =
    (status: number, body: unknown): Handler =>
    (_body, _req, res) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(body));
    };

const completion = (content: string, extra: Record<string, unknown> = {}) => ({
    model: "test/model-served",
    choices: [{ finish_reason: "stop", message: { content }, ...extra }],
    usage: { prompt_tokens: 900, completion_tokens: 120, cost: 0.00042 },
});

const thrownBy = async (promise: Promise<unknown>): Promise<unknown> => {
    try {
        await promise;
    } catch (err) {
        return err;
    }
    throw new Error("expected an error");
};

const errorCodeOf = async (promise: Promise<unknown>) => ((await thrownBy(promise)) as AiError).code;

describe("OpenRouterProvider.createCompletion", () => {
    it("sends one chat request with the prompt, the facts and a JSON schema, and reads the answer and usage", async () => {
        handler = reply(200, completion(JSON.stringify(ANSWER)));

        const result = await generator().createCompletion(FACTS, "test/model");

        expect(result).toEqual({
            output: ANSWER,
            servedModel: "test/model-served",
            inputTokens: 900,
            outputTokens: 120,
            costUsd: 0.00042,
        });
        expect(lastRequest.url).toBe("/api/v1/chat/completions");
        expect(lastRequest.headers.authorization).toBe("Bearer test-key");
        expect(lastRequest.body).toMatchObject({
            model: "test/model",
            max_tokens: 800,
            response_format: { type: "json_schema" },
            reasoning: { effort: "low", exclude: true },
        });
        expect(lastRequest.body.messages[1]).toEqual({ role: "user", content: JSON.stringify(FACTS) });
    });

    it("can switch thinking off, or not send the setting at all", async () => {
        handler = reply(200, completion(JSON.stringify(ANSWER)));
        const make = (reasoningEffort: ReasoningEffort) =>
            new OpenRouterProvider({
                apiKey: "k",
                baseUrl,
                timeoutMs: 2000,
                maxOutputTokens: 100,
                reasoningEffort,
            });

        await make(ReasoningEffort.OFF).createCompletion(FACTS, "test/model");
        expect(lastRequest.body.reasoning).toEqual({ enabled: false });

        await make(ReasoningEffort.NONE).createCompletion(FACTS, "test/model");
        expect(lastRequest.body.reasoning).toBeUndefined();
    });

    it.each([
        [429, AiErrorCode.RATE_LIMITED],
        [401, AiErrorCode.AUTH_FAILED],
        [402, AiErrorCode.NO_CREDITS],
        [500, AiErrorCode.PROVIDER_ERROR],
    ])("turns HTTP %s into %s", async (status, code) => {
        handler = reply(status, { error: { message: "provider text that is never stored" } });
        expect(await errorCodeOf(generator().createCompletion(FACTS, "test/model"))).toBe(code);
    });

    it("stops waiting after the timeout", async () => {
        handler = (_body, _req, res) =>
            setTimeout(() => reply(200, completion(JSON.stringify(ANSWER)))(_body, _req, res), 1500);
        expect(isTimeoutError(await thrownBy(generator(1000).createCompletion(FACTS, "test/model")))).toBe(true);
    });

    it("reports a refusal", async () => {
        handler = reply(200, completion("", { message: { content: null, refusal: "I can't help with that." } }));
        expect(await errorCodeOf(generator().createCompletion(FACTS, "test/model"))).toBe(AiErrorCode.REFUSED);
    });

    it("reports text that is not JSON", async () => {
        handler = reply(200, completion("Sure! Here are your drafts..."));
        expect(await errorCodeOf(generator().createCompletion(FACTS, "test/model"))).toBe(AiErrorCode.INVALID_JSON);
    });

    it("reports an answer that was cut off", async () => {
        handler = reply(200, completion('{"briefing": "Start', { finish_reason: "length" }));
        expect(await errorCodeOf(generator().createCompletion(FACTS, "test/model"))).toBe(AiErrorCode.INVALID_OUTPUT);
    });

    it("reports a provider that cannot be reached", async () => {
        const unreachable = new OpenRouterProvider({
            apiKey: "k",
            baseUrl: "http://127.0.0.1:9/api/v1",
            timeoutMs: 2000,
            maxOutputTokens: 100,
            reasoningEffort: ReasoningEffort.NONE,
        });
        expect(await errorCodeOf(unreachable.createCompletion(FACTS, "test/model"))).toBe(
            AiErrorCode.CONNECTION_FAILED
        );
    });
});

describe("OpenRouterProvider retries", () => {
    let calls: number;

    // Answers with `first` for the first `times` calls, then with a good answer
    const failThenAnswer =
        (first: Handler, times = 1): Handler =>
        (body, req, res) => {
            calls += 1;
            const next = calls <= times ? first : reply(200, completion(JSON.stringify(ANSWER)));
            next(body, req, res);
        };

    beforeEach(() => {
        calls = 0;
    });

    it("sends again on a fresh connection when the reused one is dead (socket hang up)", async () => {
        handler = failThenAnswer((_body, req) => req.socket.destroy());

        const result = await generator().createCompletion(FACTS, "test/model");

        expect(result.output).toEqual(ANSWER);
        expect(calls).toBe(2);
    });

    it("waits for Retry-After on a rate limit, then succeeds", async () => {
        handler = failThenAnswer((_body, _req, res) => {
            res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "0" });
            res.end("{}");
        });

        const result = await generator().createCompletion(FACTS, "test/model");

        expect(result.output).toEqual(ANSWER);
        expect(calls).toBe(2);
    });

    it("tries at most 3 times while the provider stays busy", async () => {
        handler = failThenAnswer(reply(503, {}), Infinity);

        expect(await errorCodeOf(generator(10000).createCompletion(FACTS, "test/model"))).toBe(
            AiErrorCode.PROVIDER_ERROR
        );
        expect(calls).toBe(3);
    });

    it("does not retry a wrong key", async () => {
        handler = failThenAnswer(reply(401, {}), Infinity);

        expect(await errorCodeOf(generator().createCompletion(FACTS, "test/model"))).toBe(AiErrorCode.AUTH_FAILED);
        expect(calls).toBe(1);
    });
});

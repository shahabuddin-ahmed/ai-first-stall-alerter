import http from "http";
import { AddressInfo } from "net";
import { ReasoningEffort } from "../../constant/ai";
import { OpenRouterProvider } from "../ai-provider";

let server: http.Server;
let baseUrl: string;
let status = 200;
let requestedUrl: string | undefined;

const MODELS = [
    {
        id: "free/json:free",
        name: "Free JSON",
        context_length: 1000,
        supported_parameters: ["structured_outputs"],
        pricing: { prompt: "0", completion: "0" },
    },
    { id: "free/text-only:free", name: "Free text", context_length: 1000, supported_parameters: ["temperature"] },
    {
        id: "paid/json",
        name: "Paid JSON",
        context_length: 1000,
        supported_parameters: ["structured_outputs"],
        pricing: { prompt: "0.00000125", completion: "0.00001" },
    },
    { id: "auto/json", name: "Auto JSON", supported_parameters: ["structured_outputs"], pricing: { prompt: "-1" } },
];

beforeAll(async () => {
    server = http.createServer((req, res) => {
        requestedUrl = req.url;
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ data: MODELS }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
});

const provider = () =>
    new OpenRouterProvider({
        apiKey: "",
        baseUrl,
        timeoutMs: 2000,
        maxOutputTokens: 100,
        reasoningEffort: ReasoningEffort.NONE,
    });

describe("OpenRouterProvider.fetchModels", () => {
    it("keeps only models that support JSON output, with prices per 1M tokens", async () => {
        status = 200;

        const models = await provider().fetchModels();

        expect(requestedUrl).toBe("/api/v1/models");
        expect(models).toEqual([
            { modelId: "free/json:free", name: "Free JSON", contextLength: 1000, inputPrice: 0, outputPrice: 0 },
            { modelId: "paid/json", name: "Paid JSON", contextLength: 1000, inputPrice: 1.25, outputPrice: 10 },
            { modelId: "auto/json", name: "Auto JSON", contextLength: null, inputPrice: null, outputPrice: null },
        ]);
    });

    it("fails when OpenRouter answers with an error", async () => {
        status = 500;

        await expect(provider().fetchModels()).rejects.toThrow("HTTP 500");
    });
});

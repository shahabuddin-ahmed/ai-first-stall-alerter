import http from "http";
import { AddressInfo } from "net";
import { HttpModelSource } from "../model-source";

let server: http.Server;
let baseUrl: string;
let status = 200;
let requestedUrl: string | undefined;

const MODELS = [
    { id: "free/json:free", name: "Free JSON", context_length: 1000, supported_parameters: ["structured_outputs"] },
    { id: "free/text-only:free", name: "Free text", context_length: 1000, supported_parameters: ["temperature"] },
    { id: "paid/json", name: "Paid JSON", context_length: 1000, supported_parameters: ["structured_outputs"] },
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

describe("HttpModelSource", () => {
    it("keeps only free models that support JSON output", async () => {
        status = 200;

        const models = await new HttpModelSource(baseUrl).listFreeModels();

        expect(requestedUrl).toBe("/api/v1/models");
        expect(models).toEqual([{ modelId: "free/json:free", name: "Free JSON", contextLength: 1000 }]);
    });

    it("fails when OpenRouter answers with an error", async () => {
        status = 500;

        await expect(new HttpModelSource(baseUrl).listFreeModels()).rejects.toThrow("HTTP 500");
    });
});

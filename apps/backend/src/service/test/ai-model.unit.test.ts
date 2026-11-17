import { AiService } from "../ai";
import { AiModel, AiProviderInterface, CompletionResult } from "../ai-provider";
import { AI_MODEL_LIST } from "../../constant/ai";
import { ServiceUnavailableException } from "../../web/exception/service-unavailable-exception";

const LING: AiModel = { modelId: "inclusionai/ling-3.2-flash:free", name: "Ling", contextLength: null, inputPrice: 0, outputPrice: 0 };
const OTHER: AiModel = { modelId: "other/model:free", name: "Other", contextLength: null, inputPrice: 1, outputPrice: 2 };

class CountingSource implements AiProviderInterface {
    calls = 0;
    answer: () => Promise<AiModel[]> = async () => [LING];

    async createCompletion(): Promise<CompletionResult> {
        throw new Error("not used");
    }

    async fetchModels(): Promise<AiModel[]> {
        this.calls += 1;
        return this.answer();
    }
}

let source: CountingSource;
let service: AiService;
let now: number;

beforeEach(() => {
    source = new CountingSource();
    service = new AiService(source, true);
    now = Date.now();
    jest.spyOn(Date, "now").mockImplementation(() => now);
});

afterEach(() => jest.restoreAllMocks());

describe("AiService model list", () => {
    it("fetches the list once and keeps it in memory for 1 day", async () => {
        expect(await service.listModels()).toEqual([LING]);
        now += AI_MODEL_LIST.CACHE_MS - 1;
        expect(await service.listModels()).toEqual([LING]);
        expect(source.calls).toBe(1);
    });

    it("fetches again after 1 day", async () => {
        await service.listModels();
        now += AI_MODEL_LIST.CACHE_MS;
        source.answer = async () => [LING, OTHER];

        expect(await service.listModels()).toEqual([LING, OTHER]);
        expect(source.calls).toBe(2);
    });

    it("says the list is unavailable when OpenRouter cannot be reached, and tries again next time", async () => {
        source.answer = async () => {
            throw new Error("network error");
        };
        await expect(service.listModels()).rejects.toBeInstanceOf(ServiceUnavailableException);

        source.answer = async () => [LING];
        expect(await service.listModels()).toEqual([LING]);
        expect(source.calls).toBe(2);
    });

    it("knows whether a model is in the list", async () => {
        expect(await service.isModelAvailable(LING.modelId)).toBe(true);
        expect(await service.isModelAvailable("paid/model")).toBe(false);
    });
});

import { AiService } from "../ai";
import { AiProviderInterface, GenerationResult } from "../ai-provider";
import { AI_MODEL_LIST } from "../../constant/ai";
import { AiModelInterface } from "../../model/ai-model";
import { AiModelRepoInterface } from "../../repo/ai-model";

const LING: AiModelInterface = { modelId: "inclusionai/ling-3.2-flash:free", name: "Ling", contextLength: null };
const OTHER: AiModelInterface = { modelId: "other/model:free", name: "Other", contextLength: null };

class MemoryRepo implements AiModelRepoInterface {
    models: AiModelInterface[] = [];

    async list(): Promise<AiModelInterface[]> {
        return this.models;
    }

    async replaceAll(models: AiModelInterface[]): Promise<void> {
        this.models = models;
    }
}

class CountingSource implements AiProviderInterface {
    calls = 0;
    answer: () => Promise<AiModelInterface[]> = async () => [LING];

    async generate(): Promise<GenerationResult> {
        throw new Error("not used");
    }

    async listModels(): Promise<AiModelInterface[]> {
        this.calls += 1;
        return this.answer();
    }
}

let repo: MemoryRepo;
let source: CountingSource;
let service: AiService;
let now: number;

beforeEach(() => {
    repo = new MemoryRepo();
    source = new CountingSource();
    service = new AiService(repo, source, true);
    now = Date.now();
    jest.spyOn(Date, "now").mockImplementation(() => now);
});

afterEach(() => jest.restoreAllMocks());

describe("AiService model list", () => {
    it("fetches the list once, saves it in the DB and keeps it in memory for 30 minutes", async () => {
        expect(await service.listModels()).toEqual([LING]);
        expect(await service.listModels()).toEqual([LING]);
        expect(source.calls).toBe(1);
        expect(repo.models).toEqual([LING]);
    });

    it("fetches again after 30 minutes", async () => {
        await service.listModels();
        now += AI_MODEL_LIST.CACHE_MS;
        source.answer = async () => [LING, OTHER];

        expect(await service.listModels()).toEqual([LING, OTHER]);
        expect(source.calls).toBe(2);
    });

    it("uses the list saved in the DB when OpenRouter cannot be reached", async () => {
        repo.models = [OTHER];
        source.answer = async () => {
            throw new Error("network error");
        };

        expect(await service.listModels()).toEqual([OTHER]);
    });

    it("knows whether a model is in the list", async () => {
        expect(await service.isModelAvailable(LING.modelId)).toBe(true);
        expect(await service.isModelAvailable("paid/model")).toBe(false);
    });
});

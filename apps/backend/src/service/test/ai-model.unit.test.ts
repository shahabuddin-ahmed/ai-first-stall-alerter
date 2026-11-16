import { ModelSource } from "../../ai/model-source";
import { AI_MODEL_LIST } from "../../constant/ai";
import { AiModelInterface } from "../../model/ai-model";
import { AiModelRepoInterface } from "../../repo/ai-model";
import { AiModelService } from "../ai-model";

const LING: AiModelInterface = { modelId: "inclusionai/ling-3.2-flash:free", name: "Ling", contextLength: null };
const OTHER: AiModelInterface = { modelId: "other/model:free", name: "Other", contextLength: null };

class MemoryRepo implements AiModelRepoInterface {
    models: AiModelInterface[] = [];
    refreshedAt: Date | null = null;

    async list(): Promise<AiModelInterface[]> {
        return this.models;
    }

    async lastRefreshedAt(): Promise<Date | null> {
        return this.refreshedAt;
    }

    async replaceAll(models: AiModelInterface[]): Promise<void> {
        this.models = models;
        this.refreshedAt = new Date();
    }
}

class CountingSource implements ModelSource {
    calls = 0;
    answer: () => Promise<AiModelInterface[]> = async () => [LING];

    async listFreeModels(): Promise<AiModelInterface[]> {
        this.calls += 1;
        return this.answer();
    }
}

let repo: MemoryRepo;
let source: CountingSource;
let service: AiModelService;
let warnLog: jest.SpyInstance;

beforeEach(() => {
    repo = new MemoryRepo();
    source = new CountingSource();
    service = new AiModelService(repo, source);
    warnLog = jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => warnLog.mockRestore());

describe("AiModelService", () => {
    it("fetches the list once and reuses it for 30 minutes", async () => {
        expect(await service.list()).toEqual([LING]);
        expect(await service.list()).toEqual([LING]);
        expect(source.calls).toBe(1);
    });

    it("fetches again when the saved list is older than 30 minutes", async () => {
        await service.list();
        repo.refreshedAt = new Date(Date.now() - AI_MODEL_LIST.CACHE_MS - 1);
        source.answer = async () => [LING, OTHER];

        expect(await service.list()).toEqual([LING, OTHER]);
        expect(source.calls).toBe(2);
    });

    it("keeps the saved list when OpenRouter cannot be reached", async () => {
        await service.list();
        repo.refreshedAt = new Date(0);
        source.answer = async () => {
            throw new Error("network error");
        };

        expect(await service.list()).toEqual([LING]);
    });

    it("makes one fetch when several requests come at the same time", async () => {
        await Promise.all([service.list(), service.list(), service.list()]);
        expect(source.calls).toBe(1);
    });

    it("knows whether a model is in the list", async () => {
        expect(await service.isAvailable(LING.modelId)).toBe(true);
        expect(await service.isAvailable("paid/model")).toBe(false);
    });
});

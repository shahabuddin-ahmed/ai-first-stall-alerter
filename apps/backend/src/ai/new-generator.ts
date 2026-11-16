import { AiGenerator } from "./generator";
import { FakeAiGenerator } from "./fake-generator";
import { HttpAiGenerator } from "./http-generator";
import { AiMode } from "../constant/ai";
import type { AiConfig } from "../config/config";

export const newAiGenerator = (ai: AiConfig): AiGenerator | null => {
    if (ai.AI_MODE === AiMode.FAKE) {
        return new FakeAiGenerator();
    }
    if (!ai.AI_API_KEY || !ai.AI_MODEL) {
        return null;
    }
    return new HttpAiGenerator({
        apiKey: ai.AI_API_KEY,
        model: ai.AI_MODEL,
        baseUrl: ai.AI_BASE_URL,
        timeoutMs: ai.AI_TIMEOUT_MS,
        maxOutputTokens: ai.AI_MAX_OUTPUT_TOKENS,
        reasoningEffort: ai.AI_REASONING_EFFORT,
    });
};

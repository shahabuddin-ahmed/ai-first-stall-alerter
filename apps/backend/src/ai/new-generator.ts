import { AiGenerator } from "./generator";
import { FakeAiGenerator } from "./fake-generator";
import { HttpAiGenerator } from "./http-generator";
import { AiMode } from "../constant/ai";
import type { AiConfig } from "../config/config";

// Picks the AI from the server settings. null = AI is not set up, so templates are always used.
export const newAiGenerator = (ai: Omit<AiConfig, "TOP_N">): AiGenerator | null => {
    if (ai.MODE === AiMode.FAKE) {
        return new FakeAiGenerator();
    }
    if (!ai.API_KEY || !ai.MODEL) {
        return null;
    }
    return new HttpAiGenerator({
        apiKey: ai.API_KEY,
        model: ai.MODEL,
        baseUrl: ai.BASE_URL,
        timeoutMs: ai.TIMEOUT_MS,
        maxOutputTokens: ai.MAX_OUTPUT_TOKENS,
        reasoningEffort: ai.REASONING_EFFORT,
    });
};

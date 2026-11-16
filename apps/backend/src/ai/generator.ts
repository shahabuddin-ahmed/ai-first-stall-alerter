import { AiErrorCode } from "../constant/ai";
import { InsightFacts } from "../rules/ai-facts";

export interface AiUsage {
    servedModel: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number | null;
}

export interface GenerationResult extends AiUsage {
    output: unknown;
}

export interface AiGenerator {
    generate(facts: InsightFacts, model: string): Promise<GenerationResult>;
}

export class AiError extends Error {
    constructor(
        public readonly code: AiErrorCode,
        message?: string
    ) {
        super(message ?? code);
        this.name = "AiError";
    }
}

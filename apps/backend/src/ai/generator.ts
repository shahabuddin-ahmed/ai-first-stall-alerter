import { AiErrorCode } from "../constant/ai";
import { InsightFacts } from "../rules/ai-facts";

// What a call to the model gives back: the raw answer (checked later by the guardrails) and usage numbers.
export interface GenerationResult {
    output: unknown;
    servedModel: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number | null;
}

// Anything that can write insights from facts: the real HTTP call, or the fake one for tests and demos.
export interface AiGenerator {
    readonly model: string;
    generate(facts: InsightFacts): Promise<GenerationResult>;
}

// A failed call, with a short code that is safe to store and show (never the provider's message).
export class AiError extends Error {
    constructor(public readonly code: AiErrorCode, message?: string) {
        super(message ?? code);
        this.name = "AiError";
    }
}

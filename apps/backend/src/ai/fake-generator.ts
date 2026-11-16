import { ActionCode } from "../constant/stage";
import { actionsOf, InsightFacts } from "../rules/ai-facts";
import { AiGenerator, GenerationResult } from "./generator";
import { BottleneckType } from "../constant/board";

const DRAFTS: Record<ActionCode, string> = {
    [ActionCode.REVIEW_APPLICATION]:
        "Hi, could you take a look at {{name}}'s application for the {{role}} role and let me know the next step? Thanks, {{recruiter}}",
    [ActionCode.SCHEDULE_SCREEN]:
        "Hi {{first_name}}, I would love to set up a short call about the {{role}} role. Which times work for you? Best, {{recruiter}}",
    [ActionCode.REQUEST_FEEDBACK]:
        "Hi team, could you send your feedback on {{name}} for the {{role}} role when you can? Thanks, {{recruiter}}",
    [ActionCode.REVIEW_ASSESSMENT]:
        "Hi, could you review {{name}}'s assessment for the {{role}} role and share your result? Thanks, {{recruiter}}",
    [ActionCode.CHASE_REFERENCES]:
        "Hi {{first_name}}, could you check that your referees received our request for the {{role}} role? Best, {{recruiter}}",
    [ActionCode.CONFIRM_OFFER]:
        "Hi {{first_name}}, I wanted to check in on the {{role}} offer. Do you have any questions, or a decision? Best, {{recruiter}}",
    [ActionCode.GENERIC_FOLLOW_UP]:
        "Hi {{first_name}}, I am checking in on your application for the {{role}} role. Best, {{recruiter}}",
};

export class FakeAiGenerator implements AiGenerator {
    async generate(facts: InsightFacts, model: string): Promise<GenerationResult> {
        return {
            output: {
                briefing: `Start with rank 1. ${facts.board.stalled} candidates are past their stage threshold.`,
                bottleneck_notes: facts.bottlenecks.map((bottleneck) =>
                    bottleneck.type === BottleneckType.STAGE
                        ? `${bottleneck.stalled} follow-ups share the same next action. Clear them together.`
                        : `${bottleneck.recruiter_key} owns ${bottleneck.stalled} stalled follow-ups. Share some of the load.`
                ),
                drafts: actionsOf(facts).map((action_code) => ({ action_code, text: DRAFTS[action_code] })),
            },
            servedModel: model,
            inputTokens: null,
            outputTokens: null,
            costUsd: null,
        };
    }
}

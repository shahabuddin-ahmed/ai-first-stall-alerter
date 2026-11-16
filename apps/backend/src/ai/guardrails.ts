import { AI_LIMITS, DRAFT_PLACEHOLDERS, SENDER_PLACEHOLDER } from "../constant/ai";
import { ActionCode } from "../constant/stage";
import { actionsOf, InsightFacts } from "../service/hiring-board/ai-facts";
import { RESPONSE_SCHEMA } from "./prompt";

export interface ActionDraft {
    action_code: ActionCode;
    text: string;
}

export interface AiOutput {
    briefing: string;
    bottleneck_notes: string[];
    drafts: ActionDraft[];
}

export type GuardrailResult = { ok: true; output: AiOutput } | { ok: false; problems: string[] };

const LINK_OR_MARKUP = /https?:\/\/|www\.|<\/?[a-z!][^>]*>|\[[^\]]*\]\([^)]*\)/i;
const PLACEHOLDER = /\{\{[^{}]*\}\}/g;

const numbersIn = (value: unknown, found = new Set<number>()): Set<number> => {
    if (typeof value === "number") {
        found.add(value);
    } else if (Array.isArray(value)) {
        value.forEach((item) => numbersIn(item, found));
    } else if (value && typeof value === "object") {
        Object.values(value).forEach((item) => numbersIn(item, found));
    }
    return found;
};

const checkText = (label: string, text: string, maxChars: number, problems: string[]): void => {
    if (text.length === 0) {
        problems.push(`${label} is empty`);
    }
    if (text.length > maxChars) {
        problems.push(`${label} is longer than ${maxChars} characters`);
    }
    if (LINK_OR_MARKUP.test(text)) {
        problems.push(`${label} contains a link or markup`);
    }
    Object.values(ActionCode)
        .filter((code) => text.includes(code))
        .forEach((code) => problems.push(`${label} uses the code ${code} instead of plain words`));
};

const checkNumbers = (label: string, text: string, allowed: Set<number>, problems: string[]): void => {
    for (const number of text.match(/\d+/g) ?? []) {
        if (!allowed.has(Number(number))) {
            problems.push(`${label} uses the number ${number}, which is not in the facts`);
        }
    }
};

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const ANSWER_FIELDS: readonly string[] = RESPONSE_SCHEMA.required;
const DRAFT_FIELDS: readonly string[] = RESPONSE_SCHEMA.properties.drafts.items.required;
const MAX_FIELD_NAME_CHARS = 40;

const unexpectedFields = (label: string, value: Record<string, unknown>, expected: readonly string[]): string[] =>
    Object.keys(value)
        .filter((key) => !expected.includes(key))
        .map((key) => `${label}has an unexpected field "${key.slice(0, MAX_FIELD_NAME_CHARS)}"`);

const shapeProblems = (raw: unknown): string[] => {
    if (!isObject(raw)) {
        return ["the answer is not a JSON object"];
    }
    const problems = unexpectedFields("the answer ", raw, ANSWER_FIELDS);
    if (typeof raw.briefing !== "string") {
        problems.push("briefing is missing or not text");
    }
    if (!Array.isArray(raw.bottleneck_notes)) {
        problems.push("bottleneck_notes is missing or not a list");
    } else {
        raw.bottleneck_notes.forEach((note, index) => {
            if (typeof note !== "string") {
                problems.push(`bottleneck_notes[${index}] is not text`);
            }
        });
    }
    if (!Array.isArray(raw.drafts)) {
        problems.push("drafts is missing or not a list");
    } else {
        raw.drafts.forEach((draft, index) => {
            if (!isObject(draft)) {
                problems.push(`drafts[${index}] is not an object`);
                return;
            }
            problems.push(...unexpectedFields(`drafts[${index}] `, draft, DRAFT_FIELDS));
            if (typeof draft.action_code !== "string") {
                problems.push(`drafts[${index}].action_code is missing or not text`);
            }
            if (typeof draft.text !== "string") {
                problems.push(`drafts[${index}].text is missing or not text`);
            }
        });
    }
    return problems;
};

export const checkAiOutput = (raw: unknown, facts: InsightFacts): GuardrailResult => {
    const wrongShape = shapeProblems(raw);
    if (wrongShape.length > 0) {
        return { ok: false, problems: wrongShape };
    }

    const answer = raw as AiOutput;
    const problems: string[] = [];
    const allowedNumbers = numbersIn(facts);
    const wanted = actionsOf(facts);
    const output: AiOutput = {
        briefing: answer.briefing.trim(),
        bottleneck_notes: answer.bottleneck_notes.map((note) => note.trim()),
        drafts: answer.drafts
            .map((draft) => ({ action_code: draft.action_code, text: draft.text.trim() }))
            .sort((a, b) => wanted.indexOf(a.action_code) - wanted.indexOf(b.action_code)),
    };

    checkText("briefing", output.briefing, AI_LIMITS.BRIEFING_CHARS, problems);
    checkNumbers("briefing", output.briefing, allowedNumbers, problems);

    if (output.bottleneck_notes.length !== facts.bottlenecks.length) {
        problems.push(`expected ${facts.bottlenecks.length} bottleneck notes, got ${output.bottleneck_notes.length}`);
    }
    output.bottleneck_notes.forEach((note, index) => {
        checkText(`bottleneck note ${index + 1}`, note, AI_LIMITS.BOTTLENECK_NOTE_CHARS, problems);
        checkNumbers(`bottleneck note ${index + 1}`, note, allowedNumbers, problems);
    });

    const got = output.drafts.map((draft) => draft.action_code);
    if (got.length !== new Set(got).size) {
        problems.push("an action has more than one draft");
    }
    wanted.filter((action) => !got.includes(action)).forEach((action) => problems.push(`${action} has no draft`));
    got.filter((action) => !wanted.includes(action)).forEach((action) => problems.push(`${action} was not requested`));

    for (const draft of output.drafts) {
        const label = `draft for ${draft.action_code}`;
        checkText(label, draft.text, AI_LIMITS.DRAFT_CHARS, problems);
        const placeholders = draft.text.match(PLACEHOLDER) ?? [];
        placeholders
            .filter((placeholder) => !(DRAFT_PLACEHOLDERS as readonly string[]).includes(placeholder))
            .forEach((placeholder) => problems.push(`${label} uses an unknown placeholder ${placeholder}`));
        if (placeholders.filter((placeholder) => placeholder === SENDER_PLACEHOLDER).length > 1) {
            problems.push(`${label} uses ${SENDER_PLACEHOLDER} more than once (it is only for the signature)`);
        }
        const withoutPlaceholders = draft.text.replace(PLACEHOLDER, "");
        if (/[{}]/.test(withoutPlaceholders)) {
            problems.push(`${label} has a broken placeholder`);
        }
        if (/\d/.test(withoutPlaceholders)) {
            problems.push(`${label} contains a digit (no dates or day counts in messages)`);
        }
    }

    return problems.length > 0 ? { ok: false, problems } : { ok: true, output };
};

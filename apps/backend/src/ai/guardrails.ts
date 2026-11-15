import { AI_LIMITS, DRAFT_PLACEHOLDERS } from "../constant/ai";
import { InsightFacts } from "../rules/ai-facts";

export interface AiOutput {
    briefing: string;
    bottleneck_notes: string[];
    drafts: { rank: number; text: string }[];
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

export const checkAiOutput = (raw: unknown, facts: InsightFacts): GuardrailResult => {
    if (
        !isObject(raw) ||
        typeof raw.briefing !== "string" ||
        !Array.isArray(raw.bottleneck_notes) ||
        !raw.bottleneck_notes.every((note) => typeof note === "string") ||
        !Array.isArray(raw.drafts) ||
        !raw.drafts.every((draft) => isObject(draft) && Number.isInteger(draft.rank) && typeof draft.text === "string")
    ) {
        return { ok: false, problems: ["the answer does not have the expected fields"] };
    }

    const problems: string[] = [];
    const allowedNumbers = numbersIn(facts);
    const output: AiOutput = {
        briefing: raw.briefing.trim(),
        bottleneck_notes: (raw.bottleneck_notes as string[]).map((note) => note.trim()),
        drafts: (raw.drafts as { rank: number; text: string }[])
            .map((draft) => ({ rank: draft.rank, text: draft.text.trim() }))
            .sort((a, b) => a.rank - b.rank),
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

    const wanted = facts.alerts.map((alert) => alert.rank);
    const got = output.drafts.map((draft) => draft.rank);
    if (got.length !== new Set(got).size) {
        problems.push("a rank has more than one draft");
    }
    wanted.filter((rank) => !got.includes(rank)).forEach((rank) => problems.push(`rank ${rank} has no draft`));
    got.filter((rank) => !wanted.includes(rank)).forEach((rank) => problems.push(`rank ${rank} was not requested`));

    for (const draft of output.drafts) {
        const label = `draft for rank ${draft.rank}`;
        checkText(label, draft.text, AI_LIMITS.DRAFT_CHARS, problems);
        const placeholders = draft.text.match(PLACEHOLDER) ?? [];
        placeholders
            .filter((placeholder) => !(DRAFT_PLACEHOLDERS as readonly string[]).includes(placeholder))
            .forEach((placeholder) => problems.push(`${label} uses an unknown placeholder ${placeholder}`));
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

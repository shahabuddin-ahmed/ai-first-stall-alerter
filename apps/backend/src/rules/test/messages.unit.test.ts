import { ActionCode, RecipientType, TimerSource } from "../../constant/stage";
import { ACTIONS, explainReason, templateMessage } from "../messages";

describe("ACTIONS", () => {
    it("sends each message to whoever has to act", () => {
        expect(Object.fromEntries(Object.entries(ACTIONS).map(([code, action]) => [code, action.recipient]))).toEqual({
            REVIEW_APPLICATION: RecipientType.HIRING_MANAGER,
            SCHEDULE_SCREEN: RecipientType.CANDIDATE,
            REQUEST_FEEDBACK: RecipientType.INTERVIEW_PANEL,
            REVIEW_ASSESSMENT: RecipientType.ASSESSMENT_REVIEWER,
            CHASE_REFERENCES: RecipientType.CANDIDATE,
            CONFIRM_OFFER: RecipientType.CANDIDATE,
            GENERIC_FOLLOW_UP: RecipientType.CANDIDATE,
        });
    });
});

describe("explainReason", () => {
    const base = {
        name: "Hana Novak", stage: "Applied", recruiter: "Recruiter C", actionCode: ActionCode.REVIEW_APPLICATION,
        stageThreshold: 5, timerFrom: "2026-10-10", timerSource: TimerSource.STAGE_ENTERED,
    };

    it("explains a stall from the stage start", () => {
        expect(explainReason({ ...base, daysInStage: 34, overdueDays: 29 })).toBe(
            "Hana Novak has been in Applied for 34 days with no recorded activity. The Applied threshold is 5 days, " +
            "so the application is 29 days overdue. Recruiter C should review the application."
        );
    });

    it("explains a stall from the last activity", () => {
        expect(explainReason({ ...base, timerSource: TimerSource.LAST_ACTIVITY, daysInStage: 6, overdueDays: 1 })).toBe(
            "Hana Novak has had no activity in Applied since 2026-10-10 (6 days). The Applied threshold is 5 days, " +
            "so the application is 1 day overdue. Recruiter C should review the application."
        );
    });

    it("says 'due today' when the threshold is reached today", () => {
        expect(explainReason({ ...base, stageThreshold: 1, daysInStage: 1, overdueDays: 0 })).toContain(
            "The Applied threshold is 1 day, so the follow-up is due today."
        );
    });
});

describe("templateMessage", () => {
    const facts = { name: "Amara Okafor", firstName: "Amara", role: "Backend Engineer", recruiter: "Recruiter A" };

    it("addresses the candidate by first name", () => {
        expect(templateMessage(ActionCode.CONFIRM_OFFER, facts)).toBe(
            "Hi Amara, I am following up on the offer for the Backend Engineer position. " +
            "Please let me know your decision or any questions you have. Best regards, Recruiter A"
        );
    });

    it("addresses the hiring manager about the candidate", () => {
        expect(templateMessage(ActionCode.REVIEW_APPLICATION, facts)).toBe(
            "Hi, could you review Amara Okafor's application for the Backend Engineer role? " +
            "It is waiting in Applied and needs a decision on the next step. Thanks, Recruiter A"
        );
    });

    it.each(Object.values(ActionCode))("%s makes no timing promises and has no unfilled placeholders", (code) => {
        const message = templateMessage(code, facts);
        expect(message).not.toMatch(/[{}]/);
        expect(message).not.toMatch(/\b(today|tomorrow|this week|soon|asap)\b/i);
    });
});

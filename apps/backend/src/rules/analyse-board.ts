import { ActionCode, StageType, TimerSource } from "../constant/stage";
import { findBottlenecks } from "./bottlenecks";
import { daysBetween, parseIsoDate } from "./dates";
import { ACTIONS, explainReason, firstNameOf, templateMessage } from "./messages";
import { buildStageLookup } from "./stage-matcher";
import { BoardAnalysis, ParsedBoard, QueueItem, StageConfig } from "./types";
import { validateRecords } from "./row-checks";

type Unranked = Omit<QueueItem, "rank" | "reason" | "templateMessage">;

// Most overdue first, then the later pipeline stage, then candidate ID by plain character codes (spec C4).
const byUrgency = (a: Unranked, b: Unranked): number =>
    b.overdueDays - a.overdueDays ||
    b.stagePosition - a.stagePosition ||
    (a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0);

// The whole board for one reference date and stage setup: counts, row errors, the ranked queue, bottlenecks.
// Pure: no database, network or clock, so the same input always gives the same answer.
// The caller passes a real reference date (the import service checks it).
export const analyseBoard = (board: ParsedBoard, stages: StageConfig[], referenceDate: string): BoardAnalysis => {
    const referenceDay = parseIsoDate(referenceDate) as number;

    const { valid, rowErrors } = validateRecords(board, buildStageLookup(stages), referenceDay);

    let terminal = 0;
    let onHold = 0;
    let notStalled = 0;
    const stalled: Unranked[] = [];

    for (const { record, stage, enteredDay, activityDay, contactDay } of valid) {
        if (stage.type === StageType.FINAL) {
            terminal += 1;
            continue;
        }
        if (stage.type === StageType.PAUSED) {
            onHold += 1;
            continue;
        }
        // A watched stage always has a threshold (checked when the stages are saved).
        const threshold = stage.thresholdDays as number;

        // The timer restarts on real progress (last_activity_at), never on contact.
        const fromActivity = activityDay !== null && activityDay > enteredDay;
        const daysInStage = daysBetween(fromActivity ? activityDay : enteredDay, referenceDay);
        if (daysInStage < threshold) {
            notStalled += 1;
            continue;
        }

        const actionCode = stage.actionCode ?? ActionCode.GENERIC_FOLLOW_UP;
        stalled.push({
            recordNumber: record.recordNumber,
            candidateId: record.candidateId,
            name: record.name,
            firstName: firstNameOf(record.name),
            role: record.role,
            stage: stage.name,
            stagePosition: stage.position,
            recruiter: record.recruiter,
            timerFrom: fromActivity ? record.lastActivityAt : record.stageEnteredAt,
            timerSource: fromActivity ? TimerSource.LAST_ACTIVITY : TimerSource.STAGE_ENTERED,
            daysInStage,
            stageThreshold: threshold,
            overdueDays: daysInStage - threshold,
            actionCode,
            actionLabel: ACTIONS[actionCode].label,
            recipient: ACTIONS[actionCode].recipient,
            lastContactedAt: record.lastContactedAt || null,
            daysSinceContact: contactDay === null ? null : daysBetween(contactDay, referenceDay),
        });
    }

    const queue: QueueItem[] = stalled.sort(byUrgency).map((item, index) => ({
        ...item,
        rank: index + 1,
        reason: explainReason(item),
        templateMessage: templateMessage(item.actionCode, item),
    }));

    return {
        referenceDate,
        counts: {
            total: board.records.length,
            valid: valid.length,
            invalid: rowErrors.length,
            terminal,
            onHold,
            stalled: queue.length,
            notStalled,
        },
        rowErrors,
        queue,
        bottlenecks: findBottlenecks(queue),
    };
};

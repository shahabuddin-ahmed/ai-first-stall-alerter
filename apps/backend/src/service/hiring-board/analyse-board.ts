import { ActionCode, StageType, TimerSource } from "../../constant/stage";
import { findBottlenecks } from "./bottlenecks";
import { daysBetween, parseIsoDate } from "../../utils/dates";
import { ACTIONS, explainReason, firstNameOf, templateMessage } from "./messages";
import { buildStageLookup } from "./stage-matcher";
import { BoardAnalysis, ParsedBoard, QueueItem, StageConfig, StalledCandidate } from "./types";
import { validateRecords } from "./row-checks";

const byUrgency = (a: StalledCandidate, b: StalledCandidate): number =>
    b.overdueDays - a.overdueDays ||
    b.stagePosition - a.stagePosition ||
    (a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0);

export const analyseBoard = (board: ParsedBoard, stages: StageConfig[], referenceDate: string): BoardAnalysis => {
    const referenceDay = parseIsoDate(referenceDate) as number;

    const { valid, rowErrors } = validateRecords(board, buildStageLookup(stages), referenceDay);

    let terminal = 0;
    let onHold = 0;
    let notStalled = 0;
    const stalled: StalledCandidate[] = [];

    for (const { record, stage, enteredDay, activityDay, contactDay } of valid) {
        if (stage.type === StageType.FINAL) {
            terminal += 1;
            continue;
        }
        if (stage.type === StageType.PAUSED) {
            onHold += 1;
            continue;
        }
        const threshold = stage.thresholdDays as number;

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

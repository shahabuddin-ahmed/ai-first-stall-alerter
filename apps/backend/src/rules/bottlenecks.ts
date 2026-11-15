import { Bottleneck, QueueItem } from "./types";

const MIN_STALLED = 2;

const countBy = (items: QueueItem[], key: (item: QueueItem) => string): Map<string, number> => {
    const counts = new Map<string, number>();
    items.forEach((item) => counts.set(key(item), (counts.get(key(item)) ?? 0) + 1));
    return counts;
};

// Where follow-ups pile up (spec C6): the stage and the recruiter with the most stalled candidates.
// Shown only when the count is 2 or more.
export const findBottlenecks = (queue: QueueItem[]): Bottleneck[] => {
    const bottlenecks: Bottleneck[] = [];

    const positions = new Map(queue.map((item) => [item.stage, item.stagePosition]));
    const [topStage] = [...countBy(queue, (item) => item.stage)].sort(
        ([stageA, countA], [stageB, countB]) => countB - countA || positions.get(stageB)! - positions.get(stageA)!
    ); // ties → the later stage
    if (topStage && topStage[1] >= MIN_STALLED) {
        bottlenecks.push({ type: "stage", key: topStage[0], stalled: topStage[1] });
    }

    const [topRecruiter] = [...countBy(queue, (item) => item.recruiter)].sort(
        ([nameA, countA], [nameB, countB]) => countB - countA || (nameA < nameB ? -1 : nameA > nameB ? 1 : 0)
    ); // ties → name A-Z
    if (topRecruiter && topRecruiter[1] >= MIN_STALLED) {
        bottlenecks.push({ type: "recruiter", key: topRecruiter[0], stalled: topRecruiter[1] });
    }

    return bottlenecks;
};

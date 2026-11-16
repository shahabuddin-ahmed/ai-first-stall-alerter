import { Bottleneck, QueueItem } from "./types";
import { BOARD_LIMITS, BottleneckType } from "../../constant/board";

const countBy = (items: QueueItem[], key: (item: QueueItem) => string): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const item of items) {
        const value = key(item);
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return counts;
};

export const findBottlenecks = (queue: QueueItem[]): Bottleneck[] => {
    const bottlenecks: Bottleneck[] = [];

    const positions = new Map(queue.map((item) => [item.stage, item.stagePosition]));
    const [topStage] = [...countBy(queue, (item) => item.stage)].sort(
        ([stageA, countA], [stageB, countB]) => countB - countA || positions.get(stageB)! - positions.get(stageA)!
    );
    if (topStage && topStage[1] >= BOARD_LIMITS.MIN_BOTTLENECK_STALLED) {
        bottlenecks.push({ type: BottleneckType.STAGE, key: topStage[0], stalled: topStage[1] });
    }

    const [topRecruiter] = [...countBy(queue, (item) => item.recruiter)].sort(
        ([nameA, countA], [nameB, countB]) => countB - countA || (nameA < nameB ? -1 : nameA > nameB ? 1 : 0)
    );
    if (topRecruiter && topRecruiter[1] >= BOARD_LIMITS.MIN_BOTTLENECK_STALLED) {
        bottlenecks.push({ type: BottleneckType.RECRUITER, key: topRecruiter[0], stalled: topRecruiter[1] });
    }

    return bottlenecks;
};

import { QueueItem } from "./types";

export interface QueueFilter {
    stage?: string;
    recruiter?: string;
    search?: string;
}

export const filterQueue = (queue: QueueItem[], filter: QueueFilter): QueueItem[] => {
    const search = filter.search?.toLowerCase();
    return queue.filter(
        (item) =>
            (!filter.stage || item.stage === filter.stage) &&
            (!filter.recruiter || item.recruiter === filter.recruiter) &&
            (!search || item.name.toLowerCase().includes(search) || item.candidateId.toLowerCase().includes(search))
    );
};

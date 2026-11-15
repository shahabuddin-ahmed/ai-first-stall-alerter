import { QueueItem } from "./types";

export interface QueueFilter {
    stage?: string;
    recruiter?: string;
    search?: string; // part of a name or candidate ID, any capitals
}

// The same filter for the screen and the export. Ranks are given before filtering, so they never change.
export const filterQueue = (queue: QueueItem[], filter: QueueFilter): QueueItem[] => {
    const search = filter.search?.toLowerCase(); // already trimmed by the request check
    return queue.filter(
        (item) =>
            (!filter.stage || item.stage === filter.stage) &&
            (!filter.recruiter || item.recruiter === filter.recruiter) &&
            (!search || item.name.toLowerCase().includes(search) || item.candidateId.toLowerCase().includes(search))
    );
};

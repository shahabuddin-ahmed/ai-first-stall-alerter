import { Router } from "express";
import { asyncHandler } from "../../middleware/async-hander";
import { InsightControllerInterface } from "../../controller/v1/insight";

// Mounted at /imports/:id/insights, so it needs the :id from the parent path.
export const newInsightRouter = async (insightController: InsightControllerInterface): Promise<Router> => {
    const router = Router({ mergeParams: true });

    router.post("/", asyncHandler(insightController.create));

    return router;
};

export default newInsightRouter;

import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { InsightControllerInterface } from "../../controller/v1/insight";

export const newInsightRouter = async (insightController: InsightControllerInterface): Promise<Router> => {
    const router = Router({ mergeParams: true });

    router.post("/", asyncHandler(insightController.create));

    return router;
};

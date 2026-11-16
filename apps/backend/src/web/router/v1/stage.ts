import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { StageControllerInterface } from "../../controller/v1/stage";

export const newStageRouter = async (stageController: StageControllerInterface): Promise<Router> => {
    const router = Router();

    router.get("/", asyncHandler(stageController.list));
    router.put("/", asyncHandler(stageController.save));

    return router;
};

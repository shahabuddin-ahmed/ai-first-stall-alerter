import { Router } from "express";
import { asyncHandler } from "../../middleware/async-hander";
import { SettingControllerInterface } from "../../controller/v1/setting";

export const newSettingRouter = async (settingController: SettingControllerInterface): Promise<Router> => {
    const router = Router();

    router.get("/", asyncHandler(settingController.get));
    router.put("/", asyncHandler(settingController.update));
    router.get("/models", asyncHandler(settingController.listModels));

    return router;
};

export default newSettingRouter;

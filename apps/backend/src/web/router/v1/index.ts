import { Router } from "express";
import { PostController } from "./../../controller/v1/post";
import { newPostRouter } from "./post";
import { NotFoundException } from "../../exception/not-found-exception";
import { ERROR_CODES } from "../../../constant/error";
import { newHealthRouter } from "./health";
import { StageController } from "../../controller/v1/stage";
import { SettingController } from "../../controller/v1/setting";
import { newStageRouter } from "./stage";
import { newSettingRouter } from "./setting";

export const newV1Router = async ({
    postController,
    stageController,
    settingController,
}: {
    postController: PostController;
    stageController: StageController;
    settingController: SettingController;
}): Promise<Router> => {
    const v1 = Router();
    v1.use("/health", await newHealthRouter());
    v1.use("/posts", await newPostRouter(postController));
    v1.use("/stages", await newStageRouter(stageController));
    v1.use("/settings", await newSettingRouter(settingController));

    v1.use("*", (_req, res) => {
        console.log(`not_found_for_v1`, _req.method, _req.baseUrl);
        throw new NotFoundException(ERROR_CODES.E_PAGE_NOT_FOUND, "", [
            `Cannot ${_req.method} ${_req.baseUrl}`,
        ]);
    });

    return v1;
};

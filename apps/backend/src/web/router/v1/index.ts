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
import { ImportController } from "../../controller/v1/import";
import { newImportRouter } from "./import";
import { InsightController } from "../../controller/v1/insight";
import { newInsightRouter } from "./insight";
import { ExportController } from "../../controller/v1/export";
import { newExportRouter } from "./export";

export const newV1Router = async ({
    postController,
    stageController,
    settingController,
    importController,
    insightController,
    exportController,
}: {
    postController: PostController;
    stageController: StageController;
    settingController: SettingController;
    importController: ImportController;
    insightController: InsightController;
    exportController: ExportController;
}): Promise<Router> => {
    const v1 = Router();
    v1.use("/health", await newHealthRouter());
    v1.use("/posts", await newPostRouter(postController));
    v1.use("/stages", await newStageRouter(stageController));
    v1.use("/settings", await newSettingRouter(settingController));
    v1.use("/imports/:id/insights", await newInsightRouter(insightController));
    v1.use("/imports/:id/export", await newExportRouter(exportController));
    v1.use("/imports", await newImportRouter(importController));

    v1.use("*", (req) => {
        throw new NotFoundException(ERROR_CODES.E_PAGE_NOT_FOUND, "", [`Cannot ${req.method} ${req.baseUrl}`]);
    });

    return v1;
};

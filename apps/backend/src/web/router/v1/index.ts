import { Router } from "express";
import { ERROR_CODES } from "../../../constant/error";
import { ExportControllerInterface } from "../../controller/v1/export";
import { ImportControllerInterface } from "../../controller/v1/import";
import { InsightControllerInterface } from "../../controller/v1/insight";
import { SettingControllerInterface } from "../../controller/v1/setting";
import { StageControllerInterface } from "../../controller/v1/stage";
import { NotFoundException } from "../../exception/not-found-exception";
import { newExportRouter } from "./export";
import { newHealthRouter } from "./health";
import { newImportRouter } from "./import";
import { newInsightRouter } from "./insight";
import { newSettingRouter } from "./setting";
import { newStageRouter } from "./stage";

export interface V1Controllers {
    stageController: StageControllerInterface;
    settingController: SettingControllerInterface;
    importController: ImportControllerInterface;
    insightController: InsightControllerInterface;
    exportController: ExportControllerInterface;
}

export const newV1Router = async ({
    stageController,
    settingController,
    importController,
    insightController,
    exportController,
}: V1Controllers): Promise<Router> => {
    const v1 = Router();
    v1.use("/health", await newHealthRouter());
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

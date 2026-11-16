import { Router } from "express";
import { asyncHandler } from "../../middleware/async-hander";
import { ExportControllerInterface } from "../../controller/v1/export";

export const newExportRouter = async (exportController: ExportControllerInterface): Promise<Router> => {
    const router = Router({ mergeParams: true });

    router.get("/", asyncHandler(exportController.download));

    return router;
};

export default newExportRouter;

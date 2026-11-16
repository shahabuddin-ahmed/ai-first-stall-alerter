import { Router } from "express";
import { asyncHandler } from "../../middleware/async-handler";
import { csvUpload } from "../../middleware/csv-upload";
import { ImportControllerInterface } from "../../controller/v1/import";

export const newImportRouter = async (importController: ImportControllerInterface): Promise<Router> => {
    const router = Router();

    router.post("/", csvUpload, asyncHandler(importController.upload));
    router.get("/", asyncHandler(importController.list));
    router.get("/:id", asyncHandler(importController.getPipeline));
    router.get("/:id/errors", asyncHandler(importController.getRowErrors));
    router.delete("/:id", asyncHandler(importController.remove));

    return router;
};

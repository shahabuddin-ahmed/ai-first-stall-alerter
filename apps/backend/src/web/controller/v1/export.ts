import { Request, Response } from "express";
import Joi from "joi";
import { Controller } from "../controller";
import { CSV_CONTENT_TYPE } from "../../../constant/export";
import { HttpStatus } from "../../../constant/http";
import { ExportServiceInterface } from "../../../service/export";
import { idParamsSchema, queueFilterFields, referenceDateField } from "./common-schema";

export interface ExportControllerInterface {
    download(req: Request, res: Response): any;
}

// The same filters as the queue screen (no pages: the file has every matching row).
const querySchema = Joi.object({
    referenceDate: referenceDateField,
    ...queueFilterFields,
});

export class ExportController extends Controller implements ExportControllerInterface {
    constructor(private exportService: ExportServiceInterface) {
        super();
        this.download = this.download.bind(this);
    }

    // GET /imports/:id/export — a CSV file download, not JSON. Errors are still JSON.
    async download(req: Request, res: Response): Promise<any> {
        const { value: params } = await this.validateRequest(idParamsSchema, req.params);
        const { value: query } = await this.validateRequest(querySchema, req.query);
        const file = await this.exportService.exportCsv(params.id, query);

        res.setHeader("Content-Type", CSV_CONTENT_TYPE);
        res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
        res.setHeader("Cache-Control", "no-store");
        return res.status(HttpStatus.OK).send(file.csv);
    }
}

export const newExportV1Controller = async (exportService: ExportServiceInterface): Promise<ExportController> => {
    return new ExportController(exportService);
};

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

const querySchema = Joi.object({
    referenceDate: referenceDateField,
    ...queueFilterFields,
});

export class ExportController extends Controller implements ExportControllerInterface {
    constructor(private exportService: ExportServiceInterface) {
        super();
    }

    download = async (req: Request, res: Response): Promise<any> => {
        const { value: params } = await this.validateRequest(idParamsSchema, req.params);
        const { value: query } = await this.validateRequest(querySchema, req.query);
        const file = await this.exportService.exportCsv(params.id, query);

        res.setHeader("Content-Type", CSV_CONTENT_TYPE);
        res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
        res.setHeader("Cache-Control", "no-store");
        return res.status(HttpStatus.OK).send(file.csv);
    };
}

export const newExportV1Controller = async (exportService: ExportServiceInterface): Promise<ExportController> => {
    return new ExportController(exportService);
};

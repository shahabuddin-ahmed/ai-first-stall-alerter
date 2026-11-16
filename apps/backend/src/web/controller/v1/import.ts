import { Request, Response } from "express";
import Joi from "joi";
import { Controller } from "../controller";
import { PAGINATION } from "../../../constant/api";
import { HttpStatus } from "../../../constant/http";
import { ImportServiceInterface } from "../../../service/import";
import { idParamsSchema, pageFields, queueFilterFields, referenceDateField } from "./common-schema";

export interface ImportControllerInterface {
    upload(req: Request, res: Response): any;
    list(req: Request, res: Response): any;
    getPipeline(req: Request, res: Response): any;
    getRowErrors(req: Request, res: Response): any;
    remove(req: Request, res: Response): any;
}

const pipelineSchema = Joi.object({
    referenceDate: referenceDateField,
    ...queueFilterFields,
    ...pageFields,
});

const rowErrorsSchema = Joi.object({
    referenceDate: referenceDateField,
    ...pageFields,
});

const listSchema = Joi.object({
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(PAGINATION.MAX_LIST_LIMIT).default(PAGINATION.DEFAULT_LIST_LIMIT),
});

export class ImportController extends Controller implements ImportControllerInterface {
    constructor(private importService: ImportServiceInterface) {
        super();
    }

    upload = async (req: Request, res: Response): Promise<any> => {
        const { value } = await this.validateRequest(pipelineSchema, req.body);
        const file = req.file as Express.Multer.File;
        const data = await this.importService.upload({ fileName: file.originalname, bytes: file.buffer }, value);
        return this.sendResponse({ response: data }, data.alreadyImported ? HttpStatus.OK : HttpStatus.CREATED, res);
    };

    list = async (req: Request, res: Response): Promise<any> => {
        const { value } = await this.validateRequest(listSchema, req.query);
        const data = await this.importService.list(value.offset, value.limit);
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    };

    getPipeline = async (req: Request, res: Response): Promise<any> => {
        const { value: params } = await this.validateRequest(idParamsSchema, req.params);
        const { value: query } = await this.validateRequest(pipelineSchema, req.query);
        const data = await this.importService.getPipeline(params.id, query);
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    };

    getRowErrors = async (req: Request, res: Response): Promise<any> => {
        const { value: params } = await this.validateRequest(idParamsSchema, req.params);
        const { value: query } = await this.validateRequest(rowErrorsSchema, req.query);
        const data = await this.importService.getRowErrors(params.id, query);
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    };

    remove = async (req: Request, res: Response): Promise<any> => {
        const { value } = await this.validateRequest(idParamsSchema, req.params);
        await this.importService.remove(value.id);
        return this.sendResponse({ response: { deleted: true } }, HttpStatus.OK, res);
    };
}

export const newImportV1Controller = async (importService: ImportServiceInterface): Promise<ImportController> => {
    return new ImportController(importService);
};

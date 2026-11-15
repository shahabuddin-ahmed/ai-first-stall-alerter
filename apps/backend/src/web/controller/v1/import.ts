import { Request, Response } from "express";
import Joi from "joi";
import { Controller } from "../controller";
import { HttpStatus } from "../../../constant/http";
import { ImportServiceInterface } from "../../../service/import";

export interface ImportControllerInterface {
    upload(req: Request, res: Response): any;
    list(req: Request, res: Response): any;
    getBoard(req: Request, res: Response): any;
    getRowErrors(req: Request, res: Response): any;
    remove(req: Request, res: Response): any;
}

// Format only; the service checks that it is a real date and not in the future.
const referenceDate = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
    "string.pattern.base": "{{#label}} must be a YYYY-MM-DD date",
});

const idSchema = Joi.object({
    id: Joi.number().integer().positive().required(),
});

const pageFields = {
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(200).default(50),
};

const boardSchema = Joi.object({
    referenceDate,
    stage: Joi.string().trim().max(255),
    recruiter: Joi.string().trim().max(255),
    search: Joi.string().trim().max(100).allow(""),
    ...pageFields,
});

const rowErrorsSchema = Joi.object({
    referenceDate,
    ...pageFields,
});

const listSchema = Joi.object({
    offset: Joi.number().integer().min(0).default(0),
    limit: Joi.number().integer().min(1).max(100).default(25),
});

export class ImportController extends Controller implements ImportControllerInterface {
    constructor(private importService: ImportServiceInterface) {
        super();
        this.upload = this.upload.bind(this);
        this.list = this.list.bind(this);
        this.getBoard = this.getBoard.bind(this);
        this.getRowErrors = this.getRowErrors.bind(this);
        this.remove = this.remove.bind(this);
    }

    // POST /imports (multipart: file + referenceDate). 201 for a new file, 200 when it was already imported.
    async upload(req: Request, res: Response): Promise<any> {
        const { value } = await this.validateRequest(boardSchema, req.body);
        const file = req.file as Express.Multer.File;
        const data = await this.importService.upload({ fileName: file.originalname, bytes: file.buffer }, value);
        return this.sendResponse({ response: data }, data.alreadyImported ? HttpStatus.OK : HttpStatus.CREATED, res);
    }

    async list(req: Request, res: Response): Promise<any> {
        const { value } = await this.validateRequest(listSchema, req.query);
        const data = await this.importService.list(value.offset, value.limit);
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    }

    async getBoard(req: Request, res: Response): Promise<any> {
        const { value: params } = await this.validateRequest(idSchema, req.params);
        const { value: query } = await this.validateRequest(boardSchema, req.query);
        const data = await this.importService.getBoard(params.id, query);
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    }

    async getRowErrors(req: Request, res: Response): Promise<any> {
        const { value: params } = await this.validateRequest(idSchema, req.params);
        const { value: query } = await this.validateRequest(rowErrorsSchema, req.query);
        const data = await this.importService.getRowErrors(params.id, query);
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    }

    async remove(req: Request, res: Response): Promise<any> {
        const { value } = await this.validateRequest(idSchema, req.params);
        await this.importService.remove(value.id);
        return this.sendResponse({ response: { deleted: true } }, HttpStatus.OK, res);
    }
}

export const newImportV1Controller = async (importService: ImportServiceInterface): Promise<ImportController> => {
    return new ImportController(importService);
};

import { Request, Response } from "express";
import Joi from "joi";
import { Controller } from "../controller";
import { HttpStatus } from "../../../constant/http";
import { InsightServiceInterface } from "../../../service/insight";

export interface InsightControllerInterface {
    create(req: Request, res: Response): any;
}

const paramsSchema = Joi.object({
    id: Joi.number().integer().positive().required(),
});

const bodySchema = Joi.object({
    referenceDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).messages({
        "string.pattern.base": "{{#label}} must be a YYYY-MM-DD date",
    }),
});

export class InsightController extends Controller implements InsightControllerInterface {
    constructor(private insightService: InsightServiceInterface) {
        super();
        this.create = this.create.bind(this);
    }

    // POST /imports/:id/insights — AI text when available, templates otherwise. Always 200 with usable text.
    async create(req: Request, res: Response): Promise<any> {
        const { value: params } = await this.validateRequest(paramsSchema, req.params);
        const { value: body } = await this.validateRequest(bodySchema, req.body ?? {});
        const data = await this.insightService.getInsights(params.id, body.referenceDate);
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    }
}

export const newInsightV1Controller = async (insightService: InsightServiceInterface): Promise<InsightController> => {
    return new InsightController(insightService);
};

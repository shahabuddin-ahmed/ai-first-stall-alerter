import { Request, Response } from "express";
import Joi from "joi";
import { Controller } from "../controller";
import { HttpStatus } from "../../../constant/http";
import { InsightServiceInterface } from "../../../service/insight";
import { idParamsSchema, referenceDateField } from "./common-schema";

export interface InsightControllerInterface {
    create(req: Request, res: Response): any;
}

const bodySchema = Joi.object({
    referenceDate: referenceDateField,
});

export class InsightController extends Controller implements InsightControllerInterface {
    constructor(private insightService: InsightServiceInterface) {
        super();
        this.create = this.create.bind(this);
    }

    // POST /imports/:id/insights — AI text when available, templates otherwise. Always 200 with usable text.
    async create(req: Request, res: Response): Promise<any> {
        const { value: params } = await this.validateRequest(idParamsSchema, req.params);
        const { value: body } = await this.validateRequest(bodySchema, req.body ?? {});
        const data = await this.insightService.getInsights(params.id, body.referenceDate);
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    }
}

export const newInsightV1Controller = async (insightService: InsightServiceInterface): Promise<InsightController> => {
    return new InsightController(insightService);
};

import { Request, Response } from "express";
import Joi from "joi";
import { Controller } from "../controller";
import { HttpStatus } from "../../../constant/http";
import { AI_COLUMN_LIMITS } from "../../../constant/ai";
import { SettingStatus } from "../../../constant/setting";
import { ConfigServiceInterface } from "../../../service/config";
import { AiServiceInterface } from "../../../service/ai";

export interface SettingControllerInterface {
    get(req: Request, res: Response): any;
    update(req: Request, res: Response): any;
    listModels(req: Request, res: Response): any;
}

const updateSchema = Joi.object({
    status: Joi.number().valid(SettingStatus.INACTIVE, SettingStatus.ACTIVE).strict().required(),
    aiModel: Joi.string().max(AI_COLUMN_LIMITS.MODEL_ID).required(),
});

export class SettingController extends Controller implements SettingControllerInterface {
    constructor(
        private configService: ConfigServiceInterface,
        private aiService: AiServiceInterface
    ) {
        super();
    }

    get = async (_req: Request, res: Response): Promise<any> => {
        const data = this.configService.getSettings();
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    };

    update = async (req: Request, res: Response): Promise<any> => {
        const { value } = await this.validateRequest(updateSchema, req.body);
        const data = await this.configService.updateSettings({
            status: value.status,
            aiModel: value.aiModel,
        });
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    };

    listModels = async (_req: Request, res: Response): Promise<any> => {
        const data = await this.aiService.listModels();
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    };
}

export const newSettingV1Controller = async (
    configService: ConfigServiceInterface,
    aiService: AiServiceInterface
): Promise<SettingController> => {
    return new SettingController(configService, aiService);
};

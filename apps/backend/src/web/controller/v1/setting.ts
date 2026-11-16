import { Request, Response } from "express";
import Joi from "joi";
import { Controller } from "../controller";
import { HttpStatus } from "../../../constant/http";
import { AI_COLUMN_LIMITS } from "../../../constant/ai";
import { ConfigServiceInterface } from "../../../service/config";
import { AiModelServiceInterface } from "../../../service/ai-model";

export interface SettingControllerInterface {
    get(req: Request, res: Response): any;
    update(req: Request, res: Response): any;
    listModels(req: Request, res: Response): any;
}

const updateSchema = Joi.object({
    useAiDrafts: Joi.boolean().strict().required(),
    aiModel: Joi.string().max(AI_COLUMN_LIMITS.MODEL_ID).required(),
});

export class SettingController extends Controller implements SettingControllerInterface {
    constructor(
        private configService: ConfigServiceInterface,
        private aiModelService: AiModelServiceInterface
    ) {
        super();
    }

    get = async (_req: Request, res: Response): Promise<any> => {
        return this.sendResponse({ response: this.configService.getSettings() }, HttpStatus.OK, res);
    };

    update = async (req: Request, res: Response): Promise<any> => {
        const { value } = await this.validateRequest(updateSchema, req.body);
        const settings = await this.configService.updateSettings({
            useAiDrafts: value.useAiDrafts,
            aiModel: value.aiModel,
        });
        return this.sendResponse({ response: settings }, HttpStatus.OK, res);
    };

    listModels = async (_req: Request, res: Response): Promise<any> => {
        const models = await this.aiModelService.list();
        return this.sendResponse({ response: models }, HttpStatus.OK, res);
    };
}

export const newSettingV1Controller = async (
    configService: ConfigServiceInterface,
    aiModelService: AiModelServiceInterface
): Promise<SettingController> => {
    return new SettingController(configService, aiModelService);
};

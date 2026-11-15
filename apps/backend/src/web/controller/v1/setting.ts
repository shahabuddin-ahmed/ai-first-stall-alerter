import { Request, Response } from "express";
import Joi from "joi";
import { Controller } from "../controller";
import { HttpStatus } from "../../../constant/http";
import { ConfigServiceInterface } from "../../../service/config";

export interface SettingControllerInterface {
    get(req: Request, res: Response): any;
    update(req: Request, res: Response): any;
}

const updateSchema = Joi.object({
    useAiDrafts: Joi.boolean().strict().required(),
});

export class SettingController extends Controller implements SettingControllerInterface {
    constructor(private configService: ConfigServiceInterface) {
        super();
    }

    get = async (_req: Request, res: Response): Promise<any> => {
        return this.sendResponse({ response: this.configService.getSettings() }, HttpStatus.OK, res);
    };

    update = async (req: Request, res: Response): Promise<any> => {
        const { value } = await this.validateRequest(updateSchema, req.body);
        const settings = await this.configService.updateSettings({ useAiDrafts: value.useAiDrafts });
        return this.sendResponse({ response: settings }, HttpStatus.OK, res);
    };
}

export const newSettingV1Controller = async (configService: ConfigServiceInterface): Promise<SettingController> => {
    return new SettingController(configService);
};

import { Request, Response } from "express";
import Joi from "joi";
import { Controller } from "../controller";
import { HttpStatus } from "../../../constant/http";
import { ActionCode, STAGE_LIMITS, StageType } from "../../../constant/stage";
import { ACTIONS } from "../../../service/pipeline-messages";
import { ConfigServiceInterface, ConfigSnapshot } from "../../../service/config";

export interface StageControllerInterface {
    list(req: Request, res: Response): any;
    save(req: Request, res: Response): any;
}

const stageName = Joi.string()
    .trim()
    .min(1)
    .max(STAGE_LIMITS.MAX_NAME_LENGTH)
    .pattern(/^[\p{L}\p{N} -]+$/u)
    .messages({ "string.pattern.base": "{{#label}} can only use letters, digits, spaces and dashes" });

const saveSchema = Joi.object({
    version: Joi.number().integer().min(1).required(),
    stages: Joi.array()
        .min(1)
        .max(STAGE_LIMITS.MAX_STAGES)
        .items(
            Joi.object({
                name: stageName.required(),
                type: Joi.string()
                    .valid(...Object.values(StageType))
                    .required(),
                thresholdDays: Joi.number()
                    .integer()
                    .min(STAGE_LIMITS.MIN_THRESHOLD_DAYS)
                    .max(STAGE_LIMITS.MAX_THRESHOLD_DAYS)
                    .allow(null)
                    .default(null),
                aliases: Joi.array().max(STAGE_LIMITS.MAX_ALIASES).items(stageName).default([]),
                actionCode: Joi.string()
                    .valid(...Object.values(ActionCode))
                    .allow(null)
                    .default(null),
            })
        )
        .required(),
});

const toResponse = (snapshot: ConfigSnapshot) => ({
    version: snapshot.stagesVersion,
    stages: snapshot.stages.map((stage) => {
        const action = stage.actionCode ? ACTIONS[stage.actionCode] : null;
        return { ...stage, actionLabel: action?.label ?? null, recipient: action?.recipient ?? null };
    }),
    actions: Object.values(ActionCode).map((code) => ({
        code,
        label: ACTIONS[code].label,
        recipient: ACTIONS[code].recipient,
    })),
});

export class StageController extends Controller implements StageControllerInterface {
    constructor(private configService: ConfigServiceInterface) {
        super();
    }

    list = async (_req: Request, res: Response): Promise<any> => {
        const data = toResponse(this.configService.getSnapshot());
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    };

    save = async (req: Request, res: Response): Promise<any> => {
        const { value } = await this.validateRequest(saveSchema, req.body);
        const snapshot = await this.configService.saveStages(value.stages, value.version);
        const data = toResponse(snapshot);
        return this.sendResponse({ response: data }, HttpStatus.OK, res);
    };
}

export const newStageV1Controller = async (configService: ConfigServiceInterface): Promise<StageController> => {
    return new StageController(configService);
};

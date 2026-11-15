import { Request, Response } from "express";
import Joi from "joi";
import { Controller } from "../controller";
import { HttpStatus } from "../../../constant/http";
import { ActionCode, StageType } from "../../../constant/stage";
import { ACTIONS } from "../../../rules/messages";
import { STAGE_LIMITS } from "../../../rules/stage-list-checks";
import { ConfigServiceInterface, ConfigSnapshot } from "../../../service/config";

export interface StageControllerInterface {
    list(req: Request, res: Response): any;
    save(req: Request, res: Response): any;
}

// Letters (any language), digits, spaces and dashes, e.g. "Reference check", "Take-home"
const stageName = Joi.string()
    .trim()
    .min(1)
    .max(40)
    .pattern(/^[\p{L}\p{N} -]+$/u)
    .messages({ "string.pattern.base": "{{#label}} can only use letters, digits, spaces and dashes" });

const saveSchema = Joi.object({
    version: Joi.number().integer().min(1).required(),
    stages: Joi.array()
        .min(1)
        .max(30)
        .items(
            Joi.object({
                name: stageName.required(),
                type: Joi.string().valid(...Object.values(StageType)).required(),
                thresholdDays: Joi.number()
                    .integer()
                    .min(STAGE_LIMITS.MIN_THRESHOLD_DAYS)
                    .max(STAGE_LIMITS.MAX_THRESHOLD_DAYS)
                    .allow(null)
                    .default(null),
                aliases: Joi.array().max(10).items(stageName).default([]),
                actionCode: Joi.string().valid(...Object.values(ActionCode)).allow(null).default(null),
            })
        )
        .required(),
});

// The stages plus the fixed list of actions the page can offer in its dropdown.
const toResponse = (snapshot: ConfigSnapshot) => ({
    version: snapshot.stagesVersion,
    stages: snapshot.stages.map((stage) => ({
        ...stage,
        actionLabel: stage.actionCode ? ACTIONS[stage.actionCode].label : null,
        recipient: stage.actionCode ? ACTIONS[stage.actionCode].recipient : null,
    })),
    actions: Object.values(ActionCode).map((code) => ({
        code,
        label: ACTIONS[code].label,
        recipient: ACTIONS[code].recipient,
    })),
});

export class StageController extends Controller implements StageControllerInterface {
    constructor(private configService: ConfigServiceInterface) {
        super();
        this.list = this.list.bind(this);
        this.save = this.save.bind(this);
    }

    async list(_req: Request, res: Response): Promise<any> {
        return this.sendResponse({ response: toResponse(this.configService.getSnapshot()) }, HttpStatus.OK, res);
    }

    async save(req: Request, res: Response): Promise<any> {
        const { value } = await this.validateRequest(saveSchema, req.body);
        const snapshot = await this.configService.saveStages(value.stages, value.version);
        return this.sendResponse({ response: toResponse(snapshot) }, HttpStatus.OK, res);
    }
}

export const newStageV1Controller = async (configService: ConfigServiceInterface): Promise<StageController> => {
    return new StageController(configService);
};

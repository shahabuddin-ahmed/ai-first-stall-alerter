import Joi from "joi";
import { ISO_DATE_PATTERN, PAGINATION, SEARCH_MAX_LENGTH } from "../../../constant/api";
import { PipelineColumn, TEXT_COLUMN_LIMITS } from "../../../constant/pipeline";

export const idParamsSchema = Joi.object({
    id: Joi.string().guid({ version: "uuidv4" }).required(),
});

export const referenceDateField = Joi.string().pattern(ISO_DATE_PATTERN).messages({
    "string.pattern.base": "{{#label}} must be a YYYY-MM-DD date",
});

export const queueFilterFields = {
    stage: Joi.string().trim().max(TEXT_COLUMN_LIMITS[PipelineColumn.STAGE]),
    recruiter: Joi.string().trim().max(TEXT_COLUMN_LIMITS[PipelineColumn.RECRUITER]),
    search: Joi.string().trim().max(SEARCH_MAX_LENGTH).allow(""),
};

export const pageFields = {
    page: Joi.number().integer().min(1).default(PAGINATION.DEFAULT_PAGE),
    pageSize: Joi.number().integer().min(1).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
};

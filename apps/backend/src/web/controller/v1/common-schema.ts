import Joi from "joi";
import { ISO_DATE_PATTERN, PAGINATION, SEARCH_MAX_LENGTH } from "../../../constant/api";
import { BOARD_LIMITS } from "../../../constant/board";

// Request checks shared by the import, insight and export controllers.

export const idParamsSchema = Joi.object({
    id: Joi.number().integer().positive().required(),
});

// Format only; the import service checks that it is a real date and not in the future.
export const referenceDateField = Joi.string().pattern(ISO_DATE_PATTERN).messages({
    "string.pattern.base": "{{#label}} must be a YYYY-MM-DD date",
});

// The queue filters of the Follow-ups screen (the export uses the same ones).
export const queueFilterFields = {
    stage: Joi.string().trim().max(BOARD_LIMITS.MAX_VALUE_LENGTH),
    recruiter: Joi.string().trim().max(BOARD_LIMITS.MAX_VALUE_LENGTH),
    search: Joi.string().trim().max(SEARCH_MAX_LENGTH).allow(""),
};

export const pageFields = {
    page: Joi.number().integer().min(1).default(PAGINATION.DEFAULT_PAGE),
    pageSize: Joi.number().integer().min(1).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
};

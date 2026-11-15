import { ERROR_CODES } from "../../constant/error";
import { HttpStatus } from "../../constant/http";
import { retrieveErrorMessage } from "../../utils/utility";

// An error with an HTTP status. The global error handler turns it into the usual JSON error answer.
export class HttpException extends Error {
    constructor(
        private statusCode: HttpStatus,
        private code: ERROR_CODES,
        private customMessage?: string,
        private errors?: string[]
    ) {
        super(customMessage || retrieveErrorMessage(code));
    }
}

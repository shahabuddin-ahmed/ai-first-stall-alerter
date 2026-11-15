import { ERROR_CODES } from "../../constant/error";
import { HttpStatus } from "../../constant/http";
import { HttpException } from "./http-exception";

export class PayloadTooLargeException extends HttpException {
    constructor(code: ERROR_CODES, customMessage?: string, errors?: string[]) {
        super(HttpStatus.PAYLOAD_TOO_LARGE, code, customMessage, errors);
    }
}

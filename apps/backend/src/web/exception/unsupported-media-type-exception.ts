import { ERROR_CODES } from "../../constant/error";
import { HttpStatus } from "../../constant/http";
import { HttpException } from "./http-exception";

export class UnsupportedMediaTypeException extends HttpException {
    constructor(code: ERROR_CODES, customMessage?: string, errors?: string[]) {
        super(HttpStatus.UNSUPPORTED_MEDIA_TYPE, code, customMessage, errors);
    }
}

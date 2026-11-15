import crypto from "crypto";
import { ERROR_CODES, errorMessages } from "../constant/error";

const HASH_ALGORITHM = "sha256";

export const retrieveErrorMessage = (errorCode: ERROR_CODES): string => errorMessages[errorCode].message;

export const sha256Hex = (data: string | Buffer): string =>
    crypto.createHash(HASH_ALGORITHM).update(data).digest("hex");

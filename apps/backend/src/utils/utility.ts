import crypto from "crypto";
import { ERROR_CODES, errorMessages } from "../constant/error";
import { HASH_ALGORITHM } from "../constant/hash";

export const retrieveErrorMessage = (errorCode: ERROR_CODES): string => errorMessages[errorCode].message;

export const sha256Hex = (data: string | Buffer): string =>
    crypto.createHash(HASH_ALGORITHM).update(data).digest("hex");

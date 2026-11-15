import crypto from "crypto";
import { ERROR_CODES, errorMessages } from "../constant/error";

const HASH_ALGORITHM = "sha256";

export function retrieveErrorMessage(errorCode: ERROR_CODES): string {
    return errorMessages[`${errorCode}`].message;
}

// SHA-256 as 64 hex characters (file hashes and AI cache keys).
export const sha256Hex = (data: string | Buffer): string =>
    crypto.createHash(HASH_ALGORITHM).update(data).digest("hex");

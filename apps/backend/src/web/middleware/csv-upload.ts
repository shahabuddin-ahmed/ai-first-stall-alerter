import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { CSV_FILE_EXTENSION, CSV_MIME_TYPES, UPLOAD_FIELD, UPLOAD_LIMITS } from "../../constant/api";
import { BOARD_LIMITS } from "../../constant/board";
import { ERROR_CODES } from "../../constant/error";
import { BadRequestException } from "../exception/bad-request-exception";
import { PayloadTooLargeException } from "../exception/payload-too-large-exception";
import { UnsupportedMediaTypeException } from "../exception/unsupported-media-type-exception";

// The file stays in memory and is never written to disk.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: BOARD_LIMITS.MAX_FILE_BYTES,
        files: UPLOAD_LIMITS.FILES,
        fields: UPLOAD_LIMITS.FIELDS,
        fieldSize: UPLOAD_LIMITS.FIELD_BYTES,
    },
}).single(UPLOAD_FIELD);

export const csvUpload = (req: Request, res: Response, next: NextFunction): void => {
    upload(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return next(new PayloadTooLargeException(ERROR_CODES.FILE_TOO_LARGE));
        }
        if (err instanceof multer.MulterError) {
            return next(
                new BadRequestException(ERROR_CODES.E_INVALID_DATA, "", [
                    `Upload one CSV file in the "${UPLOAD_FIELD}" field`,
                ])
            );
        }
        if (err) {
            return next(err);
        }
        if (!req.file) {
            return next(new BadRequestException(ERROR_CODES.E_INVALID_DATA, "", ["Choose a CSV file to upload"]));
        }

        // multer reads the file name as latin1; turn it back into UTF-8 ("Évaluation.csv")
        req.file.originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");
        const isCsvName = req.file.originalname.toLowerCase().endsWith(CSV_FILE_EXTENSION);
        if (!isCsvName || !CSV_MIME_TYPES.includes(req.file.mimetype)) {
            return next(
                new UnsupportedMediaTypeException(ERROR_CODES.UNSUPPORTED_FILE, "Upload a .csv file (CSV UTF-8).")
            );
        }
        return next();
    });
};

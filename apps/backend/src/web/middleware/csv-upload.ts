import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { BOARD_LIMITS } from "../../constant/board";
import { ERROR_CODES } from "../../constant/error";
import { BadRequestException } from "../exception/bad-request-exception";
import { PayloadTooLargeException } from "../exception/payload-too-large-exception";
import { UnsupportedMediaTypeException } from "../exception/unsupported-media-type-exception";

export const UPLOAD_FIELD = "file";

// Browsers and spreadsheet apps send CSV files with different types; the .csv name is required too.
const CSV_MIME_TYPES = ["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream", ""];

// The file stays in memory (max 5 MB) and is never written to disk.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: BOARD_LIMITS.MAX_FILE_BYTES, files: 1, fields: 5, fieldSize: 1024 },
}).single(UPLOAD_FIELD);

export const csvUpload = (req: Request, res: Response, next: NextFunction): void => {
    upload(req, res, (err: unknown) => {
        if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
            return next(new PayloadTooLargeException(ERROR_CODES.FILE_TOO_LARGE));
        }
        if (err instanceof multer.MulterError) {
            return next(new BadRequestException(ERROR_CODES.E_INVALID_DATA, "", [`Upload one CSV file in the "${UPLOAD_FIELD}" field`]));
        }
        if (err) {
            return next(err);
        }
        if (!req.file) {
            return next(new BadRequestException(ERROR_CODES.E_INVALID_DATA, "", ["Choose a CSV file to upload"]));
        }

        // multer reads the file name as latin1; turn it back into UTF-8 ("Évaluation.csv")
        req.file.originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");
        const isCsvName = req.file.originalname.toLowerCase().endsWith(".csv");
        if (!isCsvName || !CSV_MIME_TYPES.includes(req.file.mimetype)) {
            return next(new UnsupportedMediaTypeException(ERROR_CODES.UNSUPPORTED_FILE, "Upload a .csv file (CSV UTF-8)."));
        }
        return next();
    });
};

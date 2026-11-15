import { Request, Response, NextFunction } from "express";

// Wraps an async controller so a thrown error goes to the global error handler.
export const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

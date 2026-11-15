import express from "express";
import request from "supertest";
import { newHealthRouter } from "../health";
import newSequelize from "../../../../infra/sequelize";
import { ApiResponseMessages, ERROR_CODES } from "../../../../constant/error";
import { HttpStatus } from "../../../../constant/http";
import {
    DatabaseStatus,
    HealthMessages,
    SERVICE_NAME,
    ServiceStatus,
} from "../../../../constant/health";

jest.mock("../../../../infra/sequelize", () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockedSequelize = newSequelize as unknown as jest.Mock;

const makeApp = async () => {
    const app = express();
    app.use("/api/v1/health", await newHealthRouter());
    return app;
};

afterEach(() => {
    jest.clearAllMocks();
});

describe("GET /api/v1/health", () => {
    it("returns 200 with the StallAlert service name when the database is up", async () => {
        mockedSequelize.mockReturnValue({ authenticate: jest.fn().mockResolvedValue(undefined) });

        const res = await request(await makeApp()).get("/api/v1/health");

        expect(res.status).toBe(HttpStatus.OK);
        expect(res.body).toEqual({
            code: ApiResponseMessages.SUCCESS,
            message: HealthMessages.HEALTHY,
            response: { service: SERVICE_NAME, status: ServiceStatus.OK, database: DatabaseStatus.UP },
            errors: [],
        });
    });

    it("returns 503 and a degraded status when the database is unreachable", async () => {
        mockedSequelize.mockReturnValue({ authenticate: jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) });

        const res = await request(await makeApp()).get("/api/v1/health");

        expect(res.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(res.body).toEqual({
            code: ERROR_CODES.E_SERVICE_UNAVAILABLE,
            message: HealthMessages.DEGRADED,
            response: { service: SERVICE_NAME, status: ServiceStatus.DEGRADED, database: DatabaseStatus.DOWN },
            errors: [HealthMessages.DATABASE_CONNECTION_FAILED],
        });
    });
});

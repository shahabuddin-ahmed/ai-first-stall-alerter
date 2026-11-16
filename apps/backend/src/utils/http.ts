import axios, { Method } from "axios";
import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";
import logger from "../infra/logger";

export interface HttpRequestOptions {
    url: string;
    method?: Method;
    headers?: Record<string, string>;
    data?: unknown;
    params?: Record<string, unknown>;
    timeoutMs: number;
}

export interface HttpResponse<T> {
    data: T;
    statusCode: number;
}

const TIMEOUT_ERROR_CODES = ["ECONNABORTED", "ETIMEDOUT"];

const httpClient = axios.create({
    httpAgent: new HttpAgent({ keepAlive: true }),
    httpsAgent: new HttpsAgent({ keepAlive: true }),
});

export const isTimeoutError = (error: unknown): boolean =>
    axios.isAxiosError(error) && TIMEOUT_ERROR_CODES.includes(error.code ?? "");

export const httpRequest = async <T>({
    url,
    method = "GET",
    headers,
    data,
    params,
    timeoutMs,
}: HttpRequestOptions): Promise<HttpResponse<T>> => {
    try {
        const response = await httpClient.request<T>({ url, method, headers, data, params, timeout: timeoutMs });
        return { data: response.data, statusCode: response.status };
    } catch (error) {
        if (!axios.isAxiosError(error) || !error.response) {
            logger.error("HTTP request failed", { method, url, error: String(error) });
            throw error;
        }
        logger.warn("HTTP request returned an error", { method, url, statusCode: error.response.status });
        return { data: error.response.data as T, statusCode: error.response.status };
    }
};

import express from "express";
import bodyParser from "body-parser";
import { newV1Router } from "./web/router/v1/index";
import { newPostRepo } from "./repo/post";
import { newPostService } from "./service/post";
import { newPostV1Controller } from "./web/controller/v1/post";
import { globalErrorHandler } from "./web/middleware/global-error-handler";
import { initializeDBConnection } from "./infra/db";
import config from "./config/config";
import { newStageRepo } from "./repo/stage";
import { newSettingRepo } from "./repo/setting";
import { newConfigService } from "./service/config";
import { newStageV1Controller } from "./web/controller/v1/stage";
import { newSettingV1Controller } from "./web/controller/v1/setting";
import { newImportRepo } from "./repo/import";
import { newImportService } from "./service/import";
import { newImportV1Controller } from "./web/controller/v1/import";
import { newAiGenerator } from "./ai/new-generator";
import { newAiInsightRepo } from "./repo/ai-insight";
import { newLlmCallRepo } from "./repo/llm-call";
import { newInsightService } from "./service/insight";
import { newInsightV1Controller } from "./web/controller/v1/insight";
import { newExportService } from "./service/export";
import { newExportV1Controller } from "./web/controller/v1/export";
import { requestId } from "./web/middleware/request-id";
import { requestLogger } from "./web/middleware/request-logger";
import { newCors, securityHeaders } from "./web/middleware/security";
import { newRateLimit } from "./web/middleware/rate-limit";
import { API_PREFIX, JSON_BODY_LIMIT } from "./constant/api";

const app = express();

app.use(securityHeaders);
app.use(requestId);
app.use(requestLogger);
app.use(newCors(config.SECURITY.WEB_ORIGIN));
app.use(bodyParser.json({ limit: JSON_BODY_LIMIT }));

app.post(`${API_PREFIX}/imports`, newRateLimit(config.SECURITY.RATE_LIMIT_UPLOADS_PER_MINUTE));
app.post(`${API_PREFIX}/imports/:id/insights`, newRateLimit(config.SECURITY.RATE_LIMIT_INSIGHTS_PER_MINUTE));

export const appReady: Promise<void> = (async () => {
    await initializeDBConnection();

    const postRepo = await newPostRepo();
    const stageRepo = await newStageRepo();
    const settingRepo = await newSettingRepo();
    const importRepo = await newImportRepo();
    const aiInsightRepo = await newAiInsightRepo();
    const llmCallRepo = await newLlmCallRepo();

    const aiGenerator = newAiGenerator(config.AI);

    const postService = await newPostService(postRepo);
    const configService = await newConfigService(stageRepo, settingRepo, {
        configured: aiGenerator !== null,
        model: aiGenerator?.model ?? null,
    });
    const importService = await newImportService(importRepo, configService);
    const insightService = await newInsightService(
        importService,
        configService,
        aiInsightRepo,
        llmCallRepo,
        aiGenerator,
        config.AI.AI_TOP_N
    );
    const exportService = await newExportService(importService, insightService);

    const postV1Controller = await newPostV1Controller(postService);
    const stageV1Controller = await newStageV1Controller(configService);
    const settingV1Controller = await newSettingV1Controller(configService);
    const importV1Controller = await newImportV1Controller(importService);
    const insightV1Controller = await newInsightV1Controller(insightService);
    const exportV1Controller = await newExportV1Controller(exportService);

    const v1Router = await newV1Router({
        postController: postV1Controller,
        stageController: stageV1Controller,
        settingController: settingV1Controller,
        importController: importV1Controller,
        insightController: insightV1Controller,
        exportController: exportV1Controller,
    });

    app.use(API_PREFIX, v1Router);
    app.use(globalErrorHandler);
})();

export default app;

import express from "express";
import bodyParser from "body-parser";
import morgan from "morgan";
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

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

(async () => {
    await initializeDBConnection();

    // Initialize Repo
    const postRepo = await newPostRepo();
    const stageRepo = await newStageRepo();
    const settingRepo = await newSettingRepo();
    const importRepo = await newImportRepo();
    const aiInsightRepo = await newAiInsightRepo();
    const llmCallRepo = await newLlmCallRepo();

    // AI: null when no key/model is set (templates only). AI_MODE=fake uses the built-in stand-in.
    const aiGenerator = newAiGenerator(config.AI);

    // Initialize Service
    const postService = await newPostService(postRepo);
    // Loads the hiring stages and settings into memory once; saves update MySQL first, then memory.
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
        config.AI.TOP_N
    );

    // Initialize Controller
    const postV1Controller = await newPostV1Controller(postService);
    const stageV1Controller = await newStageV1Controller(configService);
    const settingV1Controller = await newSettingV1Controller(configService);
    const importV1Controller = await newImportV1Controller(importService);
    const insightV1Controller = await newInsightV1Controller(insightService);

    // Initialize Router
    const v1Router = await newV1Router({
        postController: postV1Controller,
        stageController: stageV1Controller,
        settingController: settingV1Controller,
        importController: importV1Controller,
        insightController: insightV1Controller,
    });

    app.use(morgan("short"));
    app.use("/api/v1", v1Router);
    app.use(globalErrorHandler);
})();

export default app;

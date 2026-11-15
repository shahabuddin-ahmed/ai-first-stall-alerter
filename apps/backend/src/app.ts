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

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

(async () => {
    await initializeDBConnection();

    // Initialize Repo
    const postRepo = await newPostRepo();
    const stageRepo = await newStageRepo();
    const settingRepo = await newSettingRepo();

    // Initialize Service
    const postService = await newPostService(postRepo);
    // Loads the hiring stages and settings into memory once; saves update MySQL first, then memory.
    const configService = await newConfigService(stageRepo, settingRepo, {
        configured: Boolean(config.AI.API_KEY && config.AI.MODEL),
        model: config.AI.MODEL || null,
    });

    // Initialize Controller
    const postV1Controller = await newPostV1Controller(postService);
    const stageV1Controller = await newStageV1Controller(configService);
    const settingV1Controller = await newSettingV1Controller(configService);

    // Initialize Router
    const v1Router = await newV1Router({
        postController: postV1Controller,
        stageController: stageV1Controller,
        settingController: settingV1Controller,
    });

    app.use(morgan("short"));
    app.use("/api/v1", v1Router);
    app.use(globalErrorHandler);
})();

export default app;

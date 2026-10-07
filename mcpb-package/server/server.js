"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_config_1 = __importDefault(require("./config/env.config"));
const db_config_1 = __importDefault(require("./config/db.config"));
const shutdown_1 = require("./config/shutdown");
let server;
const start = async () => {
    try {
        await (0, db_config_1.default)();
        server = app_1.default.listen(env_config_1.default.PORT, () => {
            console.log(`Server is running on http://localhost:${env_config_1.default.PORT}`);
        });
    }
    catch (error) {
        console.error("Server failed to start", error);
        process.exit(1);
    }
};
process.on("SIGINT", () => {
    console.log("SIGINT received");
    (0, shutdown_1.gracefulShutdown)(server);
});
process.on("SIGTERM", () => {
    console.log("SIGTERM received");
    (0, shutdown_1.gracefulShutdown)(server);
});
process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION", err);
    process.exit(1);
});
process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION", err);
    (0, shutdown_1.gracefulShutdown)(server);
});
start();

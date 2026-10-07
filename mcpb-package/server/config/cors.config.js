"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const env_config_1 = __importDefault(require("./env.config"));
const AppError_1 = __importDefault(require("../utils/AppError"));
const allowedOrigins = env_config_1.default.CORS_ORGINS || [];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new AppError_1.default("Not Allowed by CORS", 403));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept"
    ],
    maxAge: 86400
};
exports.default = (0, cors_1.default)(corsOptions);

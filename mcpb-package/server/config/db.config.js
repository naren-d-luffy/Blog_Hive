"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const env_config_1 = __importDefault(require("./env.config"));
const connectDB = async (uri) => {
    try {
        mongoose_1.default.set("strictQuery", true);
        const DB_URL = uri ?? env_config_1.default.DB_URL;
        const conn = await mongoose_1.default.connect(DB_URL, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log(`MongoDB Connected:${conn.connection.host}`);
        mongoose_1.default.connection.on("connected", () => {
            console.log("MongoDB connected");
        });
        mongoose_1.default.connection.on("disconnected", () => {
            console.log("MongoDB disconnected");
        });
        mongoose_1.default.connection.on("error", (err) => {
            console.log("MongoDB connection error:", err);
        });
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error Connecting to db:", error.message);
        }
        process.exit(1);
    }
};
exports.default = connectDB;

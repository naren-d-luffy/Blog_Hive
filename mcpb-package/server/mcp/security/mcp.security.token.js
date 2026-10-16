"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMcpAccessToken = generateMcpAccessToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_config_1 = __importDefault(require("../../config/env.config"));
const CheckId_1 = __importDefault(require("../../utils/CheckId"));
const ACCESS_SECRET = env_config_1.default.ACCESS_TOKEN;
function generateMcpAccessToken(user, expiresIn = "2h") {
    (0, CheckId_1.default)(user.id);
    return jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, ACCESS_SECRET, {
        expiresIn: expiresIn,
    });
}

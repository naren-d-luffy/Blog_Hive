"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const logger_controller_1 = require("./logger.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = express_1.default.Router();
// Securing the route so only admins can view system logs
router.use(auth_middleware_1.Authenticate, (0, auth_middleware_1.Authorize)("admin"));
router.get("/", logger_controller_1.loggerController.getLogs);
exports.default = router;

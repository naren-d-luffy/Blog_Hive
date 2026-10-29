import express from "express";
import { loggerController } from "./logger.controller";
import { Authenticate, Authorize } from "../../middleware/auth.middleware";

const router = express.Router();

// Securing the route so only admins can view system logs
router.use(Authenticate, Authorize("admin"));

router.get("/", loggerController.getLogs);

export default router;

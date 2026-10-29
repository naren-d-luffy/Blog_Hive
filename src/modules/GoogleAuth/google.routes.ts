import { Router } from "express";
import { googleController } from "./google.controller";
import { googleRateLimiter } from "../../middleware/google.rateLimiter";

const googleRouter = Router();

googleRouter.use(googleRateLimiter);

googleRouter.get("/", googleController.initiateAuth);
googleRouter.get("/callback", googleController.callback);
googleRouter.post("/verify", googleController.verifyToken);

export default googleRouter;

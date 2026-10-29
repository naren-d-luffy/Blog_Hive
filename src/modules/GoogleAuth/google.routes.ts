import { Router } from "express";
import { googleController } from "./google.controller";

const googleRouter = Router();

googleRouter.get("/", googleController.initiateAuth);
googleRouter.get("/callback", googleController.callback);
googleRouter.post("/verify", googleController.verifyToken);

export default googleRouter;

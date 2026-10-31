import express from "express";
import {Authenticate,Authorize} from "../../middleware/auth.middleware";
import { tokenController } from "./token.controller";

const router = express.Router();

router.use(Authenticate,Authorize("admin"));
router.post('/', tokenController.createAdminInvite);

export default router;
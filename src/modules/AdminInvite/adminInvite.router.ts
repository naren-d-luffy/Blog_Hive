import express from "express";
import {Authenticate,Authorize} from "../../middleware/auth.middleware";
import { adminInviteController } from "./adminInvite.controller";

const router = express.Router();

router.use(Authenticate,Authorize("admin"));
router.post('/', adminInviteController.createAdminInvite);

export default router;
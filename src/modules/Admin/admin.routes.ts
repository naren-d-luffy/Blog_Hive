import express from "express";
import { adminController } from "./admin.controller";
import {Authenticate,Authorize} from "../../middleware/auth.middleware";

const router = express.Router();

router.post('/', adminController.createAdmin);
router.post('/login', adminController.login);

router.use(Authenticate,Authorize("admin"));

router.post('logout', adminController.logout);


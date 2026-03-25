import express from "express";
import { adminController } from "./admin.controller";
import {Authenticate,Authorize} from "../../middleware/auth.middleware";

const router = express.Router();

router.post('/', adminController.createAdmin);
router.post('/login', adminController.login);

router.use(Authenticate,Authorize("admin"));

router.get('/', adminController.getallAdmin);
router.get('/id', adminController.getAdminById);
router.post('logout', adminController.logout);

export default router;
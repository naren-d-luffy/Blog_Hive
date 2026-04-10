import express from "express";
import { adminController } from "./admin.controller";
import {Authenticate,Authorize} from "../../middleware/auth.middleware";
import { loginRateLimiter } from "../../middleware/login.rateLimiter";
import { validateCsrf } from "../../middleware/validateCSRF";

const router = express.Router();

router.post('/', adminController.createAdmin);
router.post('/login',loginRateLimiter, adminController.login);
router.post('/refresh',validateCsrf, adminController.refreshToken);

router.use(Authenticate,Authorize("admin"));

router.get('/', adminController.getallAdmin);
router.get('/id', adminController.getAdminById);
router.post('/logout',validateCsrf, adminController.logout);
router.patch('/status/:id', adminController.updateStatus);
router.delete('/delete/:id', adminController.softDelete);

export default router;
import express from "express";
import { userController } from "./user.controller";
import {Authenticate,Authorize} from "../../middleware/auth.middleware";
import { loginRateLimiter } from "../../middleware/login.rateLimiter";

const router = express.Router();

router.post('/', userController.createuser);
router.post('/login',loginRateLimiter, userController.login);
router.post('/refresh', userController.refreshToken);

router.use(Authenticate);

router.get('/',Authorize("user"), userController.getalluser);
router.get('/id',Authorize("user"), userController.getuserById);
router.post('/logout',Authorize("user"), userController.logout);
router.patch('/status/:id',Authorize("admin"), userController.updateStatus);
router.delete('/delete/:id',Authorize("admin"), userController.softDelete);

export default router;
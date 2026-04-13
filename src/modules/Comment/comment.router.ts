import { Router } from "express";
import {commentController} from "./comment.controller";
import { Authenticate, Authorize } from "../../middleware/auth.middleware";

const router = Router();

// Public routes
router.get("/blog/:blogId", commentController.getComments);
router.get("/replies/:commentId", commentController.getReplies);

// Protected routes
router.use(Authenticate, Authorize("admin", "user"));

router.post("/blog/:blogId", commentController.createComment);
router.patch("/:commentId", commentController.updateComment);
router.delete("/:commentId", commentController.deleteComment);
router.post("/:commentId/like", commentController.likeComment);
router.delete("/:commentId/like", commentController.unlikeComment);
router.post("/:commentId/report", commentController.reportComment);

export default router;
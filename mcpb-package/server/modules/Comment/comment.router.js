"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const comment_controller_1 = require("./comment.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public routes
router.get("/blog/:blogId", comment_controller_1.commentController.getComments);
router.get("/replies/:commentId", comment_controller_1.commentController.getReplies);
// Protected routes
router.use(auth_middleware_1.Authenticate, (0, auth_middleware_1.Authorize)("admin", "user"));
router.post("/blog/:blogId", comment_controller_1.commentController.createComment);
router.patch("/:commentId", comment_controller_1.commentController.updateComment);
router.delete("/:commentId", comment_controller_1.commentController.deleteComment);
router.post("/:commentId/like", comment_controller_1.commentController.likeComment);
router.delete("/:commentId/like", comment_controller_1.commentController.unlikeComment);
router.post("/:commentId/report", comment_controller_1.commentController.reportComment);
exports.default = router;

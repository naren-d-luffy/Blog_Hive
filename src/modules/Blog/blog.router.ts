import { Router } from "express";
import { blogController } from "./blog.controller";
import { Authenticate, Authorize } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", blogController.getAllBlogs);
router.get("/trending", blogController.getAllByPopularity);
router.get("/search", blogController.searchBlogs);
router.get("/category/:category", blogController.getAllByCategory);
router.get("/tag/:tag", blogController.getAllByTag);
router.get("/author/:userId", blogController.getAllByAuthor);
router.get("/slug/:slug", blogController.getBySlug);
router.get("/:id", blogController.getById);

router.post("/:id/view", blogController.trackView);
router.post("/:id/report", blogController.reportBlog);

// ── Protected routes (requires authentication) ────────────────────────────────
router.use(Authenticate, Authorize("admin","user"))
router.post("/",blogController.createBlog,);
router.patch("/:id",blogController.updateBlog,);
router.delete("/:id",blogController.deleteBlog,);
router.post("/:id/like",blogController.likeBlog,);
router.delete("/:id/like",blogController.unlikeBlog,);

export default router;

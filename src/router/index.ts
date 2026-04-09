import express from "express";
import adminRouter from "../modules/Admin/admin.routes"
import adminInviteRouter from "../modules/AdminInvite/adminInvite.router"
import userRouter from "../modules/User/user.routes"
import blogRouter from "../modules/Blog/blog.router"

const router = express.Router();

const routes = [
    {path:"/admin", route: adminRouter},
    {path:"/admin-invite", route: adminInviteRouter},
    {path:"/user", route: userRouter},
    {path:"/blog", route: blogRouter},
]

routes.forEach(route=> {
    router.use(route.path,route.route)
})

export default router;
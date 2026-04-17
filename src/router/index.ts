import express from "express";
import adminRouter from "../modules/Admin/admin.routes"
import tokenRouter from "../modules/Token/token.router"
import userRouter from "../modules/User/user.routes"
import blogRouter from "../modules/Blog/blog.router"
import loggerRouter from "../modules/Logger/logger.routes"

const router = express.Router();

const routes = [
    {path:"/admin", route: adminRouter},
    {path:"/tokens", route: tokenRouter},
    {path:"/user", route: userRouter},
    {path:"/blog", route: blogRouter},
    {path:"/logs", route: loggerRouter},
]

routes.forEach(route=> {
    router.use(route.path,route.route)
})

export default router;
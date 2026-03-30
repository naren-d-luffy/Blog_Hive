import express from "express";
import adminRouter from "../modules/Admin/admin.routes"
import userRouter from "../modules/User/user.routes"

const router = express.Router();

const routes = [
    {path:"/admin", route: adminRouter},
    {path:"/user", route: userRouter},
]

routes.forEach(route=> {
    router.use(route.path,route.route)
})

export default router;
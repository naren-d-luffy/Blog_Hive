import express from "express";
import adminRouter from "../modules/Admin/admin.routes"

const router = express.Router();

const routes = [
    {path:"/admin", route: adminRouter},
]

routes.forEach(route=> {
    router.use(route.path,route.route)
})

export default router;
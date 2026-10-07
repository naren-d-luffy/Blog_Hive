"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_routes_1 = __importDefault(require("../modules/Admin/admin.routes"));
const token_router_1 = __importDefault(require("../modules/Token/token.router"));
const user_routes_1 = __importDefault(require("../modules/User/user.routes"));
const blog_router_1 = __importDefault(require("../modules/Blog/blog.router"));
const logger_routes_1 = __importDefault(require("../modules/Logger/logger.routes"));
const router = express_1.default.Router();
const routes = [
    { path: "/admin", route: admin_routes_1.default },
    { path: "/tokens", route: token_router_1.default },
    { path: "/user", route: user_routes_1.default },
    { path: "/blog", route: blog_router_1.default },
    { path: "/logs", route: logger_routes_1.default },
];
routes.forEach(route => {
    router.use(route.path, route.route);
});
exports.default = router;

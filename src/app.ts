import express, {Response,Request} from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import errorHandler from "./middleware/error.middleware";
import router from "./router/index";
import { rateLimiter } from "./middleware/global.rateLimiter";
import mongoose from "mongoose";
import redisClient from "./config/redis.config";
import corsConfig from "./config/cors.config";
import { httpLogger } from "./middleware/logger.middleware";
const app = express()

app.use(httpLogger);

app.use(helmet());
app.use(corsConfig);

app.use(cookieParser());

app.use(express.json({limit:"10kb"}));
app.use(express.urlencoded({extended:true}));

app.use(rateLimiter);

app.get("/",(req:Request, res:Response)=>{
    res.json({message:"Api is running fine."})
});

app.get("/health", async (req, res) => {
  const checks = {
    db: mongoose.connection.readyState === 1 ? "ok" : "failing",
    redis: redisClient.status === "ready" ? "ok" : "failing",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
  const healthy = checks.db === "ok" && checks.redis === "ok";
  res.status(healthy ? 200 : 503).json(checks);
});

app.use("/api/v1",router)

app.use((req,res)=>{
    res.status(404).json({
        success:false,
        message:"Route not found"
    })
})

app.use(errorHandler);

export default app;
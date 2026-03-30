import express, {Response,Request} from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import errorHandler from "./middleware/error.middleware";
import router from "./router/index";
import { rateLimiter } from "./middleware/global.rateLimiter";
const app = express()

app.use(helmet());
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(rateLimiter);

app.get("/",(req:Request, res:Response)=>{
    res.json({message:"Api is running fine."})
});

app.get("/health", (req:Request, res:Response)=>{
    res.json({message:"API Health is great."})
})

app.use("/api/v1",router)

app.use((req,res)=>{
    res.status(404).json({
        success:false,
        message:"Route not found"
    })
})

app.use(errorHandler);

export default app;
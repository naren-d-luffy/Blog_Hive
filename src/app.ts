import express, {Response,Request} from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";

const app = express()

app.use(helmet());
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get("/",(req:Request, res:Response)=>{
    res.json({message:"Api is running fine."})
});

export default app;
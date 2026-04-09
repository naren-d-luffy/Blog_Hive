import cors, { CorsOptions } from 'cors'
import env from "./env.config";
import AppError from '../utils/AppError';

const allowedOrigins = env.CORS_ORGINS || [];

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        if(!origin) return callback(null, true);

        if(allowedOrigins.includes(origin)){
            return callback(null, true);
        }

        return callback(new AppError("Not Allowed by CORS", 403))
    },

    credentials: true,

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept"
    ],

    maxAge: 86400
}

export default cors(corsOptions);
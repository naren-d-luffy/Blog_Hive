export default class AppError extends Error{
    statusCode: number;
    isOperational: boolean;
    details?:any;

    constructor(message:string,statusCode = 500,details?:any){
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.details = details;

        Error.captureStackTrace(this,this.constructor);
    }
}
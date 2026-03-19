import app from "./app";
import env from "./config/env.config";
import connectDB from "./config/db.config";

const start =  async():Promise<void> =>{
    try {
        await connectDB();

        app.listen(env.PORT, ()=>{
            console.log(`Server is running on http:localhost:${env.PORT}`);
            
        })
    } catch (error) {
        console.error("Server failed to start",error);
        process.exit(1);
    }
}

start();
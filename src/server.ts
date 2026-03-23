import app from "./app";
import env from "./config/env.config";
import connectDB from "./config/db.config";

let server: any;

const start = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(env.PORT, () => {
      console.log(`Server is running on http:localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start", error);
    process.exit(1);
  }
};

process.on("uncaughtException", (err: Error) => {
  console.error("UNCAUGHT EXCEPTION", err);
  process.exit(1);
});

process.on("unhandledRejection", (err: Error) => {
  console.error("UNCAUGHT REJECTION", err);
  if (server) {
    server.close(() => {
      console.log("Server Closed gracefully");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

start();
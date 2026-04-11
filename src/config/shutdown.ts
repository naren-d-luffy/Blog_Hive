import mongoose from "mongoose";
import redisClient from "./redis.config";
import { Server } from "http";

export const gracefulShutdown = async (server?: Server) => {
  console.log("Shutting down gracefully...");

  try {
    if (server) {
      await new Promise<void>((resolve) =>
        server.close(() => {
          console.log("HTTP server closed");
          resolve();
        })
      );
    }

    await mongoose.connection.close();
    console.log("MongoDB connection closed");

    await redisClient.quit();
    console.log("Redis connection closed");

    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown", error);
    process.exit(1);
  }
};
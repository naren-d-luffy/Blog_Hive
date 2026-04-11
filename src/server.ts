import app from "./app";
import env from "./config/env.config";
import connectDB from "./config/db.config";
import type {} from "./types/express";
import { connectRedis } from "./config/redis.config";
import { Server } from "http";
import { gracefulShutdown } from "./config/shutdown";

let server: Server;

const start = async (): Promise<void> => {
  try {
    await connectDB();
    await connectRedis();

    server = app.listen(env.PORT, () => {
      console.log(`Server is running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  console.log("SIGINT received");
  gracefulShutdown(server);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received");
  gracefulShutdown(server);
});

process.on("uncaughtException", (err: Error) => {
  console.error("UNCAUGHT EXCEPTION", err);
  process.exit(1);
});

process.on("unhandledRejection", (err: unknown) => {
  console.error("UNHANDLED REJECTION", err);
  gracefulShutdown(server);
});

start();
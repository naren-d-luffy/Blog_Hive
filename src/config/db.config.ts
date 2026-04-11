import mongoose from "mongoose";
import env from "./env.config";

const DB_URL = env.DB_URL;

const connectDB = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", true);

    const conn = await mongoose.connect(DB_URL, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected:${conn.connection.host}`);

    mongoose.connection.on("connected", () => {
      console.log("MongoDB connected");
    });
    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
    });
    mongoose.connection.on("error", (err: Error) => {
      console.log("MongoDB connection error:", err);
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error Connecting to db:", error.message);
    }
    process.exit(1);
  }
};

export default connectDB;

import mongoose, { Schema } from "mongoose";
import { ILogSchema } from "./logger.interface";

const logDBSchema = new Schema<ILogSchema>(
  {
    timestamp: { type: String, required: true },
    level: { type: String, enum: ["INFO", "WARN", "ERROR", "DEBUG"], required: true },
    service: { type: String, required: true },
    environment: { type: String, required: true },

    request: {
      requestId: { type: String, required: true },
      method: { type: String, required: true },
      endpoint: { type: String, required: true },
      action: { type: String, default: null },
      ip: { type: String, required: true },
    },

    user: {
      userId: { type: String, default: null },
      role: { type: String, default: null },
    },

    response: {
      statusCode: { type: Number, required: true },
      success: { type: Boolean, required: true },
      durationMs: { type: Number, required: true },
    },

    error: {
      code: { type: String, default: null },
      message: { type: String, default: null },
      stack: { type: String, default: null },
    },

    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const LogModel = mongoose.model<ILogSchema>("Log", logDBSchema);

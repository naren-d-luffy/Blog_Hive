import pino from "pino";
import env from "./env.config";

const pinoLogger = pino({
  level: env.LOG_LEVEL || "info",
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

export default pinoLogger;

import { Worker } from "bullmq";
import redisClient from "../../config/redis.config";
import connectDB from "../../config/db.config";
import { LOG_JOBS } from "../log.queue";
import { ILogSchema } from "../../modules/Logger/logger.interface";
import { LogModel } from "../../modules/Logger/logger.model";

(async () => {
  await connectDB();
  console.log("Log Worker initialized with DB connected...");

  const logWorker = new Worker(
    "log-queue",
    async (job) => {
      if (job.name === LOG_JOBS.WRITE_LOG) {
        const logData = job.data as ILogSchema;
        
        // Write exclusively to the log database seamlessly
        await LogModel.create(logData);
      }
    },
    { 
      connection: redisClient,
      concurrency: 10 
    }
  );

  logWorker.on("completed", () => {});

  logWorker.on("failed", (job, err) => {
    console.error(`[LOG WORKER FATAL] Job ${job?.id} failed:`, err);
  });
})();

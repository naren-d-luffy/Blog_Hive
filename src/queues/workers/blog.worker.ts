import { Worker } from "bullmq";
import { BLOG_JOBS } from "../blog.queue";
import { blogRepository } from "../../modules/Blog/blog.repository";
import { calculatePopularity } from "../../utils/calculatePopularity";
import redisClient from "../../config/redis.config";
import connectDB from "../../config/db.config";
import { loggerService } from "../../modules/Logger/logger.service";

(async () => {
  await connectDB();
  loggerService.info("Blog Worker started...");
  new Worker(
    "blog-queue",
    async (job) => {
      try {
        loggerService.debug(`Processing job: ${job.name}`, { jobData: job.data });
        switch (job.name) {
          case BLOG_JOBS.INCREMENT_VIEW:
            await blogRepository.incrementView(job.data.blogId);
            break;
          case BLOG_JOBS.UPDATE_POPULARITY:
            const blog = await blogRepository.findById(job.data.blogId);
            if (!blog) return;
            const score = calculatePopularity(blog);
            
            await blogRepository.updatePopularityScore(job.data.blogId, score);
            break;
          case BLOG_JOBS.SEND_NOTIFICATION:
            loggerService.info("Sending Notification", job.data);
            break;
        }
      } catch (error: any) {
        loggerService.error(`Job failed: ${job.name}`, { error: error.message, stack: error.stack });
        throw error;
      }
    },
    { connection: redisClient, concurrency: 5 },
  );
})();

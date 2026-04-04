import { Worker } from "bullmq";
import { BLOG_JOBS } from "../blog.queue";
import { blogRepository } from "../../modules/Blog/blog.repository";
import { calculatePopularity } from "../../utils/calculatePopularity";
import { redisIO } from "../../config/queue.config";

new Worker(
  "blog-queue",
  async (job) => {
    try {
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
          console.log("Sending Notification", job.data);
          break;
      }
    } catch (error) {
      console.error("Job failed:", job.name, error);
      throw error;
    }
  },
  { connection: redisIO, concurrency: 5 },
);

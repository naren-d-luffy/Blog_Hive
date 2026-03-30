import { IBlog } from "../modules/Blog/blog.interface";

export const calculatePopularity = (blog: Partial<IBlog>) => {
    const view = blog.views ?? 0;
    const like = blog.likeCount ?? 0;
    const comment = blog.comments?.length ?? 0;
    const created = blog.createdAt ? new Date(blog.createdAt).getTime() : Date.now();
    const hoursAgo = (Date.now() - created) / 3600000;

    if(hoursAgo < 0.5) return 0;

    const engagement = Math.log(view + 1)* 0.5 + like * 2 + comment * 3;

    const score = engagement / Math.pow(hoursAgo + 3, 1.5);

    return score;
};

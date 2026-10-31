import slugify from "slugify";
import { blogRepository } from "../modules/Blog/blog.repository";
import env from "../config/env.config";

const MAX_SLUG_LENGTH = env.MAX_SLUG_LENGTH;

export const generateSlug = (text: string) => {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true,
  }).substring(0,MAX_SLUG_LENGTH);
};

export const generateUniqueSlug = async (title:string, options?: {excludedId:string}): Promise<string> => {
    const base = generateSlug(title);

    const regex = new RegExp(`^${base}(-\\d+)?$`,"i");

    const existingSlug = await blogRepository.findBySlugByRegex(regex, options?.excludedId);

    if(existingSlug.length === 0) return base;

    const number = existingSlug.map((doc:any)=>{
        const match = doc.slug.match(/-(\d+)$/);
        return match ? parseInt(match[1],10) : 0;
    })
    .sort((a:number,b:number) => b-a);

    const nextNumber = (number[0] || 0) + 1;

    return `${base}-${nextNumber}`
}

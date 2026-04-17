import { z } from "zod";
import { logValidator } from "./logger.validator";

export type ILogSchema = z.infer<typeof logValidator>;

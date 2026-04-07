import {z} from 'zod'

export const createAdminInviteSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});
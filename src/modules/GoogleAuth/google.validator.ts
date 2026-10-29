import { z } from "zod";

export const initiateAuthQuerySchema = z.object({
  returnUrl: z.string().url("returnUrl must be a valid URL").optional(),
});

export const googleCallbackQuerySchema = z.object({
  code: z.string().min(1, "Authorization code is required").optional(),
  state: z.string().min(1, "State is required").optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

export const verifyGoogleTokenSchema = z
  .object({
    idToken: z.string().min(1, "Google ID token cannot be empty").optional(),
    accessToken: z.string().min(1, "Google access token cannot be empty").optional(),
  })
  .refine((data) => data.idToken || data.accessToken, {
    message: "Either idToken or accessToken must be provided",
  });

export type InitiateAuthQuery = z.infer<typeof initiateAuthQuerySchema>;
export type GoogleCallbackQuery = z.infer<typeof googleCallbackQuerySchema>;
export type VerifyGoogleTokenInput = z.infer<typeof verifyGoogleTokenSchema>;

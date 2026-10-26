import { z } from "zod";

export const createClientSchema = z
  .object({
    clientName: z.string().min(2).max(100).trim(),
    clientType: z.enum(["confidential", "public"]).default("confidential"),
    redirectUris: z
      .array(z.string().url("Must be a valid URI"))
      .min(1, "At least one redirect URI is required"),
    allowedScopes: z
      .array(z.string().trim())
      .min(1, "At least one allowed scope is required")
      .default(["read:profile"]),
  })
  .strict();

export const authorizeQuerySchema = z
  .object({
    response_type: z.literal("code", {
      error: "Only response_type=code is supported (OAuth 2.1)",
    }),
    client_id: z.string().min(1, "client_id is required"),
    redirect_uri: z.string().url("redirect_uri must be a valid URI"),
    scope: z.string().optional().default("read:profile"),
    state: z
      .string()
      .min(8, "state parameter is required for CSRF protection and must be at least 8 chars"),
    code_challenge: z
      .string()
      .min(43, "code_challenge must be at least 43 characters")
      .max(128, "code_challenge must not exceed 128 characters"),
    code_challenge_method: z.literal("S256", {
      error: "Only code_challenge_method=S256 is supported",
    }),
  })
  .strict();

export const consentBodySchema = z
  .object({
    client_id: z.string().min(1),
    redirect_uri: z.string().url(),
    scope: z.string().optional().default("read:profile"),
    state: z.string().min(8),
    code_challenge: z.string().min(43).max(128),
    code_challenge_method: z.literal("S256"),
    approved: z.boolean(),
  })
  .strict();

export const tokenRequestSchema = z
  .discriminatedUnion("grant_type", [
    // Authorization Code Grant
    z.object({
      grant_type: z.literal("authorization_code"),
      code: z.string().min(1, "code is required"),
      code_verifier: z
        .string()
        .min(43, "code_verifier must be between 43 and 128 characters")
        .max(128, "code_verifier must be between 43 and 128 characters"),
      redirect_uri: z.string().url("redirect_uri must be a valid URI"),
      client_id: z.string().optional(),
      client_secret: z.string().optional(),
    }),
    // Refresh Token Grant
    z.object({
      grant_type: z.literal("refresh_token"),
      refresh_token: z.string().min(1, "refresh_token is required"),
      scope: z.string().optional(),
      client_id: z.string().optional(),
      client_secret: z.string().optional(),
    }),
  ]);

export const revokeRequestSchema = z.object({
  token: z.string().min(1, "token is required"),
  token_type_hint: z.enum(["access_token", "refresh_token"]).optional(),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
});

export const introspectRequestSchema = z.object({
  token: z.string().min(1, "token is required"),
  token_type_hint: z.enum(["access_token", "refresh_token"]).optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type AuthorizeQueryInput = z.infer<typeof authorizeQuerySchema>;
export type ConsentBodyInput = z.infer<typeof consentBodySchema>;
export type TokenRequestInput = z.infer<typeof tokenRequestSchema>;
export type RevokeRequestInput = z.infer<typeof revokeRequestSchema>;
export type IntrospectRequestInput = z.infer<typeof introspectRequestSchema>;

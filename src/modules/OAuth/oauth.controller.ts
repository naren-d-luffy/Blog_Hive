import { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler";
import AppError from "../../utils/AppError";
import { oauthService } from "./oauth.service";
import {
  authorizeQuerySchema,
  consentBodySchema,
  createClientSchema,
  introspectRequestSchema,
  revokeRequestSchema,
  tokenRequestSchema,
} from "./oauth.validator";

export const oauthController = {
  // 1. Client Registration & Listing
  registerClient: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const parseResult = createClientSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid client data",
        errors: parseResult.error.issues,
      });
    }

    const client = await oauthService.registerClient(userId, parseResult.data);

    res.status(201).json({
      success: true,
      message: "OAuth client registered successfully",
      data: client,
    });
  }),

  listUserClients: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const clients = await oauthService.listUserClients(userId);

    res.status(200).json({
      success: true,
      message: "User clients retrieved",
      data: clients,
    });
  }),

  // 2. GET /oauth/authorize
  authorize: asyncHandler(async (req: Request, res: Response) => {
    const parseResult = authorizeQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "invalid_request",
        error_description: parseResult.error.issues.map((i) => i.message).join(", "),
      });
    }

    const { client, requestedScopes } =
      await oauthService.validateAuthorizeRequest(parseResult.data);

    // Check if the user is authenticated (via session/token)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: "login_required",
        error_description: "User must authenticate before authorizing third-party access",
        authUrl: `/login?return_to=${encodeURIComponent(req.originalUrl)}`,
      });
    }

    const outcome = await oauthService.processAuthorization(
      userId,
      parseResult.data,
      client,
      requestedScopes,
    );

    if (!outcome.promptConsent && outcome.redirectUri) {
      // If browser specifically requests text/html, 302 redirect
      if (req.headers.accept?.includes("text/html")) {
        return res.redirect(outcome.redirectUri);
      }
      return res.status(200).json({
        promptConsent: false,
        redirectUri: outcome.redirectUri,
      });
    }

    // Return consent prompt data
    return res.status(200).json(outcome);
  }),

  // 3. POST /oauth/consent
  consent: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError("Authentication required to grant consent", 401);
    }

    const parseResult = consentBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "invalid_request",
        error_description: parseResult.error.issues.map((i) => i.message).join(", "),
      });
    }

    const result = await oauthService.handleUserConsent(userId, parseResult.data);

    if (req.headers.accept?.includes("text/html")) {
      return res.redirect(result.redirectUri);
    }

    res.status(200).json({
      success: true,
      redirectUri: result.redirectUri,
    });
  }),


  // 4. POST /oauth/token
  token: asyncHandler(async (req: Request, res: Response) => {
    const parseResult = tokenRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "invalid_request",
        error_description: parseResult.error.issues.map((i) => i.message).join(", "),
      });
    }

    const authHeader = req.headers.authorization;
    const tokens = await oauthService.exchangeToken(parseResult.data, authHeader);

    // RFC 6749 response headers
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");

    res.status(200).json(tokens);
  }),

  // 5. POST /oauth/revoke (RFC 7009)
  revoke: asyncHandler(async (req: Request, res: Response) => {
    const parseResult = revokeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "invalid_request",
        error_description: "Missing required token parameter",
      });
    }

    const authHeader = req.headers.authorization;
    const result = await oauthService.revokeToken(parseResult.data, authHeader);

    res.status(200).json(result);
  }),

  // 6. POST /oauth/introspect (RFC 7662)
  introspect: asyncHandler(async (req: Request, res: Response) => {
    const parseResult = introspectRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "invalid_request",
        error_description: "Missing required token parameter",
      });
    }

    const result = await oauthService.introspectToken(parseResult.data.token);

    res.status(200).json(result);
  }),
};

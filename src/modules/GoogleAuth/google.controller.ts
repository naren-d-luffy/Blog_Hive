import { Request, Response, NextFunction } from "express";
import env from "../../config/env.config";
import AppError from "../../utils/AppError";
import { googleAuthService } from "./google.service";
import {
  initiateAuthQuerySchema,
  googleCallbackQuerySchema,
  verifyGoogleTokenSchema,
} from "./google.validator";

export const googleController = {
  /**
   * GET /api/v1/auth/google
   * Redirects user to Google's OAuth consent screen with PKCE and CSRF state.
   */
  async initiateAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = initiateAuthQuerySchema.parse(req.query);
      const authUrl = await googleAuthService.generateAuthorizationUrl(query.returnUrl);

      res.redirect(authUrl);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/auth/google/callback
   * Receives Google authorization code, verifies state, and establishes session.
   */
  async callback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = googleCallbackQuerySchema.parse(req.query);

      if (query.error) {
        throw new AppError(
          `Google OAuth authorization was denied or failed: ${query.error_description || query.error}`,
          400,
        );
      }

      if (!query.code || !query.state) {
        throw new AppError("Missing code or state in callback", 400);
      }

      const result = await googleAuthService.handleCallback(query.code, query.state);

      // Set Refresh Token HTTP-only cookie
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Set CSRF cookie
      res.cookie("csrfToken", result.csrfToken, {
        httpOnly: false,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // If client requests JSON response (e.g., API client / testing)
      if (req.headers.accept?.includes("application/json")) {
        res.status(200).json({
          success: true,
          message: result.isNewUser ? "User registered via Google successfully" : "Logged in successfully",
          accessToken: result.accessToken,
          csrfToken: result.csrfToken,
          user: result.safeData,
        });
        return;
      }

      // Default browser redirect to frontend
      const targetUrl = new URL(result.returnUrl || `${env.FRONTEND_URL}/oauth/success`);
      targetUrl.searchParams.set("token", result.accessToken);
      targetUrl.searchParams.set("csrf", result.csrfToken);

      res.redirect(targetUrl.toString());
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/auth/google/verify
   * Allows direct token exchange (Google ID token / Access token) for application JWT.
   */
  async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = verifyGoogleTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          parsed.error.issues.map((i) => i.message).join(", "),
          400,
        );
      }
      const body = parsed.data;
      const token = body.idToken || body.accessToken!;

      const { user, profile } = await googleAuthService.authenticateGoogleToken(token);
      const tokens = await googleAuthService.issueSessionTokens(user);

      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.cookie("csrfToken", tokens.csrfToken, {
        httpOnly: false,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: "Google token verified successfully",
        accessToken: tokens.accessToken,
        csrfToken: tokens.csrfToken,
        user: tokens.safeData,
        googleProfile: {
          sub: profile.sub,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

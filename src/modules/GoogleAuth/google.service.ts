import { OAuth2Client, CodeChallengeMethod } from "google-auth-library";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import env from "../../config/env.config";
import { redisClient } from "../../config/redis.config";
import AppError from "../../utils/AppError";
import { userRepository } from "../User/user.repository";
import { userService } from "../User/user.service";
import { generateToken, hashToken } from "../../utils/generateToken";
import {
  GoogleUserProfile,
  GoogleLoginResult,
  StoredOAuthState,
} from "./google.interface";
import { IUser } from "../User/user.interface";

const ACCESS_SECRET = env.ACCESS_TOKEN;
const STATE_TTL_SECONDS = 600; // 10 minutes
const TOKEN_CACHE_TTL_SECONDS = 300; // 5 minutes cache for direct token verification

function deriveCodeChallenge(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export class GoogleAuthService {
  private client: OAuth2Client | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): OAuth2Client {
    if (!this.client) {
      const clientId = env.GOOGLE_CLIENT_ID;
      const clientSecret = env.GOOGLE_CLIENT_SECRET;
      const redirectUri =
        env.GOOGLE_REDIRECT_URI ||
        `${env.BACKEND_URL}/api/v1/auth/google/callback`;

      this.client = new OAuth2Client(clientId, clientSecret, redirectUri);
    }
    return this.client;
  }

  private getClient(): OAuth2Client {
    return this.initClient();
  }

  /**
   * Generates authorization URL with PKCE (S256) and cryptographically secure state.
   */
  async generateAuthorizationUrl(returnUrl?: string): Promise<string> {
    const clientId = env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new AppError(
        "Google OAuth is not configured. GOOGLE_CLIENT_ID is missing.",
        500,
      );
    }

    const state = crypto.randomBytes(32).toString("hex");
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = deriveCodeChallenge(codeVerifier);

    const statePayload: StoredOAuthState = {
      codeVerifier,
      returnUrl,
      createdAt: Date.now(),
    };

    // Store state in Redis with 10-minute expiration
    await redisClient.set(
      `google:oauth:state:${state}`,
      JSON.stringify(statePayload),
      "EX",
      STATE_TTL_SECONDS,
    );

    const client = this.getClient();
    const authorizeUrl = client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
      prompt: "consent",
    });

    return authorizeUrl;
  }

  /**
   * Validates state, exchanges authorization code for tokens, and logs in / registers the user.
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<GoogleLoginResult> {
    if (!code || !state) {
      throw new AppError("Missing authorization code or state parameter", 400);
    }

    // 1. Verify state from Redis
    const stateKey = `google:oauth:state:${state}`;
    const rawState = await redisClient.get(stateKey);

    if (!rawState) {
      throw new AppError(
        "Invalid or expired OAuth state parameter (potential CSRF)",
        400,
      );
    }

    // Immediately invalidate state to prevent replay attacks
    await redisClient.del(stateKey);

    const storedState: StoredOAuthState = JSON.parse(rawState);
    const client = this.getClient();

    // 2. Exchange authorization code for tokens
    let tokens;
    try {
      const response = await client.getToken({
        code,
        codeVerifier: storedState.codeVerifier,
      });
      tokens = response.tokens;
    } catch (err: any) {
      throw new AppError(
        `Failed to exchange authorization code with Google: ${err.message || err}`,
        400,
      );
    }

    if (!tokens.id_token) {
      throw new AppError(
        "Google did not return an ID token in response",
        400,
      );
    }

    // 3. Cryptographically verify ID token
    const profile = await this.verifyIdTokenPayload(tokens.id_token);

    // 4. Reconcile user in database
    const { user, isNewUser } = await this.reconcileGoogleUser(profile);

    // 5. Issue application session tokens
    const sessionTokens = await this.issueSessionTokens(user);

    return {
      ...sessionTokens,
      isNewUser,
      returnUrl: storedState.returnUrl,
    };
  }

  /**
   * Cryptographically verifies Google ID Token and extracts user profile.
   */
  async verifyIdTokenPayload(idToken: string): Promise<GoogleUserProfile> {
    const clientId = env.GOOGLE_CLIENT_ID;
    const client = this.getClient();

    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new AppError("Invalid Google ID token payload", 401);
      }

      return {
        sub: payload.sub,
        email: payload.email,
        email_verified: Boolean(payload.email_verified),
        name: payload.name || payload.email.split("@")[0],
        picture: payload.picture,
        given_name: payload.given_name,
        family_name: payload.family_name,
      };
    } catch (err: any) {
      throw new AppError(
        `Google ID token verification failed: ${err.message || err}`,
        401,
      );
    }
  }

  /**
   * Direct token verification for MCP Streamable HTTP / API callers.
   * Caches verified results in Redis to avoid Google latency on high-frequency MCP calls.
   */
  async authenticateGoogleToken(
    token: string,
  ): Promise<{ user: IUser; profile: GoogleUserProfile }> {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const cacheKey = `google:token:user:${tokenHash}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const { userId, profile } = JSON.parse(cached);
      const user = await userRepository.findById(userId);
      if (user && user.status === "active" && !user.isDeleted) {
        return { user, profile };
      }
    }

    // Verify token against Google
    let profile: GoogleUserProfile;
    try {
      profile = await this.verifyIdTokenPayload(token);
    } catch {
      // Fallback: If not an ID token, check if it's an OAuth2 Access Token via UserInfo endpoint
      profile = await this.fetchProfileWithAccessToken(token);
    }

    const { user } = await this.reconcileGoogleUser(profile);

    // Cache successful verification
    await redisClient.set(
      cacheKey,
      JSON.stringify({ userId: user._id.toString(), profile }),
      "EX",
      TOKEN_CACHE_TTL_SECONDS,
    );

    return { user, profile };
  }

  /**
   * Fetches userinfo from Google's UserInfo endpoint using an access token.
   */
  private async fetchProfileWithAccessToken(
    accessToken: string,
  ): Promise<GoogleUserProfile> {
    const client = this.getClient();
    client.setCredentials({ access_token: accessToken });

    try {
      const userInfoUrl = env.GOOGLE_USERINFO_URI || "https://www.googleapis.com/oauth2/v3/userinfo";
      const response = await client.request<{
        sub: string;
        email: string;
        email_verified?: boolean;
        name?: string;
        picture?: string;
        given_name?: string;
        family_name?: string;
      }>({ url: userInfoUrl });

      const data = response.data;
      if (!data || !data.sub || !data.email) {
        throw new AppError("Invalid userinfo response from Google", 401);
      }

      return {
        sub: data.sub,
        email: data.email,
        email_verified: Boolean(data.email_verified),
        name: data.name || data.email.split("@")[0],
        picture: data.picture,
        given_name: data.given_name,
        family_name: data.family_name,
      };
    } catch (err: any) {
      throw new AppError(
        `Failed to verify Google access token: ${err.message || err}`,
        401,
      );
    }
  }

  /**
   * Reconciles Google Profile with our User database according to production security guidelines:
   * 1. Requires verified email from Google
   * 2. Finds user by Google ID (sub) -> updates last login & avatar
   * 3. Finds user by email -> links Google account if email was verified
   * 4. If new user -> creates active, verified user record
   */
  async reconcileGoogleUser(
    profile: GoogleUserProfile,
  ): Promise<{ user: IUser; isNewUser: boolean }> {
    if (!profile.email_verified) {
      throw new AppError(
        "Account linking rejected: Google email is not verified",
        400,
      );
    }

    // 1. Check by googleId
    let user = await userRepository.findByGoogleId(profile.sub);

    if (user) {
      if (user.status === "inactive") {
        throw new AppError("User account is inactive. Contact administrator.", 403);
      }
      if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
        throw new AppError("Account is temporarily locked. Try again later.", 403);
      }

      user.lastLogin = new Date();
      if (profile.picture && user.avatar !== profile.picture) {
        user.avatar = profile.picture;
      }
      await userRepository.save(user);
      return { user, isNewUser: false };
    }

    // 2. Check by email
    const normalizedEmail = profile.email.toLowerCase().trim();
    user = await userRepository.findByEmail(normalizedEmail);

    if (user) {
      if (user.status === "inactive") {
        throw new AppError("User account is inactive. Contact administrator.", 403);
      }
      if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
        throw new AppError("Account is temporarily locked. Try again later.", 403);
      }

      // Link Google Account securely
      user.googleId = profile.sub;
      user.authProvider = user.authProvider || "google";
      user.isVerified = true;
      user.lastLogin = new Date();
      if (profile.picture && !user.avatar) {
        user.avatar = profile.picture;
      }
      await userRepository.save(user);
      return { user, isNewUser: false };
    }

    // 3. Register New User via Google
    const newUser = await userRepository.create({
      name: profile.name,
      email: normalizedEmail,
      googleId: profile.sub,
      avatar: profile.picture,
      authProvider: "google",
      role: "user",
      status: "active",
      isVerified: true,
      lastLogin: new Date(),
    });

    return { user: newUser, isNewUser: true };
  }

  /**
   * Mints application JWT access token, refresh token, and CSRF token.
   */
  async issueSessionTokens(user: IUser) {
    const csrfToken = generateToken({ length: 32 });
    const hashedCsrf = hashToken(csrfToken);
    user.csrfToken = hashedCsrf;

    const payload = { id: user._id.toString(), role: user.role };
    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });

    const refreshToken = generateToken({ length: 32 });
    const hashedRefresh = hashToken(refreshToken);
    user.refreshToken = hashedRefresh;
    user.refreshTokenExpiryAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    user.lockUntil = null;
    user.failedLoginAttempt = 0;
    await userRepository.save(user);

    const safeData = userService.sanitizeUser(user);

    return {
      accessToken,
      refreshToken,
      csrfToken,
      safeData,
    };
  }
}

export const googleAuthService = new GoogleAuthService();

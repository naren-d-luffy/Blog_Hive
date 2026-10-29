import "../setup/redisMock";
import "../setup/dbSetup";
import { googleAuthService } from "../../modules/GoogleAuth/google.service";
import { redisClient } from "../../config/redis.config";
import { userRepository } from "../../modules/User/user.repository";
import env from "../../config/env.config";
import jwt from "jsonwebtoken";

// Mock google-auth-library OAuth2Client
const mockVerifyIdToken = jest.fn();
const mockGetToken = jest.fn();
const mockGenerateAuthUrl = jest.fn();
const mockRequest = jest.fn();

jest.mock("google-auth-library", () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      generateAuthUrl: (...args: any[]) => mockGenerateAuthUrl(...args),
      getToken: (...args: any[]) => mockGetToken(...args),
      verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
      setCredentials: jest.fn(),
      request: (...args: any[]) => mockRequest(...args),
    })),
    CodeChallengeMethod: {
      Plain: "plain",
      S256: "S256",
    },
  };
});

describe("Google OAuth Service & User Reconciliation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as any).GOOGLE_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
    (env as any).GOOGLE_CLIENT_SECRET = "mock-client-secret";

    mockGenerateAuthUrl.mockImplementation((opts: any) => {
      const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID!,
        state: opts.state,
        code_challenge: opts.code_challenge,
        code_challenge_method: opts.code_challenge_method,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    });
  });

  describe("1. Authorization URL & PKCE Generation", () => {
    it("generates a secure authorization URL with PKCE and state", async () => {
      const returnUrl = "http://localhost:3000/dashboard";
      const authUrl = await googleAuthService.generateAuthorizationUrl(returnUrl);

      expect(authUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth");
      expect(authUrl).toContain(`client_id=${env.GOOGLE_CLIENT_ID}`);

      const urlObj = new URL(authUrl);
      const state = urlObj.searchParams.get("state");
      expect(state).toBeTruthy();

      // Verify that state was stored in Redis with codeVerifier and returnUrl
      const stored = await redisClient.get(`google:oauth:state:${state}`);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.codeVerifier).toBeTruthy();
      expect(parsed.returnUrl).toBe(returnUrl);
    });
  });

  describe("2. OAuth Callback & CSRF Defense", () => {
    it("rejects callback when state parameter is missing or does not exist in Redis", async () => {
      await expect(
        googleAuthService.handleCallback("auth_code_123", "non_existent_state"),
      ).rejects.toThrow("Invalid or expired OAuth state parameter");
    });

    it("invalidates state immediately upon verification (single-use defense)", async () => {
      const state = "single_use_state_123";
      await redisClient.set(
        `google:oauth:state:${state}`,
        JSON.stringify({ codeVerifier: "verifier_abc", createdAt: Date.now() }),
      );

      mockGetToken.mockResolvedValueOnce({
        tokens: { id_token: "mock_id_token" },
      });
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_111",
          email: "user1@gmail.com",
          email_verified: true,
          name: "User One",
        }),
      });

      await googleAuthService.handleCallback("code_123", state);

      // State key should be deleted immediately
      const check = await redisClient.get(`google:oauth:state:${state}`);
      expect(check).toBeNull();
    });

    it("rejects user login if Google email is not verified", async () => {
      const state = "unverified_state";
      await redisClient.set(
        `google:oauth:state:${state}`,
        JSON.stringify({ codeVerifier: "verifier_abc", createdAt: Date.now() }),
      );

      mockGetToken.mockResolvedValueOnce({
        tokens: { id_token: "mock_id_token" },
      });
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_unverified",
          email: "unverified@gmail.com",
          email_verified: false,
          name: "Unverified User",
        }),
      });

      await expect(
        googleAuthService.handleCallback("code_123", state),
      ).rejects.toThrow("Account linking rejected: Google email is not verified");
    });

    it("registers a brand-new user with verified Google profile", async () => {
      const state = "new_user_state";
      await redisClient.set(
        `google:oauth:state:${state}`,
        JSON.stringify({ codeVerifier: "verifier_abc", returnUrl: "http://localhost:3000/app", createdAt: Date.now() }),
      );

      mockGetToken.mockResolvedValueOnce({
        tokens: { id_token: "mock_id_token" },
      });
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_99999",
          email: "newuser@example.com",
          email_verified: true,
          name: "New User",
          picture: "https://avatar.google.com/photo.jpg",
        }),
      });

      const result = await googleAuthService.handleCallback("code_new", state);

      expect(result.isNewUser).toBe(true);
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.csrfToken).toBeTruthy();
      expect(result.returnUrl).toBe("http://localhost:3000/app");

      // Verify user created in MongoDB
      const dbUser = await userRepository.findByGoogleId("google_99999");
      expect(dbUser).toBeTruthy();
      expect(dbUser?.email).toBe("newuser@example.com");
      expect(dbUser?.authProvider).toBe("google");
      expect(dbUser?.isVerified).toBe(true);
      expect(dbUser?.avatar).toBe("https://avatar.google.com/photo.jpg");

      // Verify JWT payload
      const decoded = jwt.verify(result.accessToken, env.ACCESS_TOKEN) as any;
      expect(decoded.id).toBe(dbUser?._id.toString());
      expect(decoded.role).toBe("user");
    });

    it("links Google identity to existing user when matching by verified email", async () => {
      // Create local user first
      const existingUser = await userRepository.create({
        name: "Existing User",
        email: "existing@example.com",
        password: "hashed_dummy_password",
        role: "user",
        status: "active",
        isVerified: true,
      });

      const state = "link_state";
      await redisClient.set(
        `google:oauth:state:${state}`,
        JSON.stringify({ codeVerifier: "verifier_abc", createdAt: Date.now() }),
      );

      mockGetToken.mockResolvedValueOnce({
        tokens: { id_token: "mock_id_token" },
      });
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_existing_sub",
          email: "existing@example.com",
          email_verified: true,
          name: "Existing User Updated",
          picture: "https://photo.jpg",
        }),
      });

      const result = await googleAuthService.handleCallback("code_link", state);

      expect(result.isNewUser).toBe(false);

      // Verify account was linked
      const updatedUser = await userRepository.findById(existingUser._id.toString());
      expect(updatedUser?.googleId).toBe("google_existing_sub");
    });

    it("logs in returning Google user directly by googleId", async () => {
      const googleUser = await userRepository.create({
        name: "Returning User",
        email: "returning@example.com",
        googleId: "google_returning_123",
        authProvider: "google",
        role: "user",
        status: "active",
        isVerified: true,
      });

      const state = "returning_state";
      await redisClient.set(
        `google:oauth:state:${state}`,
        JSON.stringify({ codeVerifier: "verifier_abc", createdAt: Date.now() }),
      );

      mockGetToken.mockResolvedValueOnce({
        tokens: { id_token: "mock_id_token" },
      });
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_returning_123",
          email: "returning@example.com",
          email_verified: true,
          name: "Returning User",
        }),
      });

      const result = await googleAuthService.handleCallback("code_ret", state);
      expect(result.isNewUser).toBe(false);
      expect(result.safeData?.email).toBe("returning@example.com");
    });
  });

  describe("3. Direct Token Verification & Cache (Dual MCP Auth)", () => {
    it("authenticates valid Google ID token and caches result in Redis", async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "direct_token_google_id",
          email: "direct_mcp_user@example.com",
          email_verified: true,
          name: "MCP Client",
        }),
      });

      const token = "google_id_token_xyz_direct";
      const { user, profile } = await googleAuthService.authenticateGoogleToken(token);

      expect(user).toBeTruthy();
      expect(profile.sub).toBe("direct_token_google_id");
      expect(profile.email).toBe("direct_mcp_user@example.com");

      // Verify cached in Redis
      const tokenHash = require("crypto").createHash("sha256").update(token).digest("hex");
      const cached = await redisClient.get(`google:token:user:${tokenHash}`);
      expect(cached).toBeTruthy();

      // Second call should resolve from cache without calling mockVerifyIdToken again
      const secondCall = await googleAuthService.authenticateGoogleToken(token);
      expect(secondCall.user._id.toString()).toBe(user._id.toString());
      expect(mockVerifyIdToken).toHaveBeenCalledTimes(1);
    });
  });
});

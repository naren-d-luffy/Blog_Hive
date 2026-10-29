import "../setup/redisMock";
import "../setup/dbSetup";
import request from "supertest";
import app from "../../app";
import { redisClient } from "../../config/redis.config";
import { userRepository } from "../../modules/User/user.repository";
import env from "../../config/env.config";

const mockVerifyIdToken = jest.fn();
const mockGetToken = jest.fn();
const mockGenerateAuthUrl = jest.fn();

jest.mock("google-auth-library", () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      generateAuthUrl: (...args: any[]) => mockGenerateAuthUrl(...args),
      getToken: (...args: any[]) => mockGetToken(...args),
      verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
      setCredentials: jest.fn(),
    })),
    CodeChallengeMethod: {
      Plain: "plain",
      S256: "S256",
    },
  };
});

describe("Google OAuth Controller Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as any).GOOGLE_CLIENT_ID = "mock-client-id.apps.googleusercontent.com";
    (env as any).GOOGLE_CLIENT_SECRET = "mock-client-secret";

    mockGenerateAuthUrl.mockImplementation((opts: any) => {
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=mock&state=${opts.state}`;
    });
  });

  describe("GET /api/v1/auth/google", () => {
    it("redirects to Google's consent page", async () => {
      const res = await request(app).get("/api/v1/auth/google");
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    });
  });

  describe("GET /api/v1/auth/google/callback", () => {
    it("returns error if state or code is missing", async () => {
      const res = await request(app).get("/api/v1/auth/google/callback");
      expect(res.status).toBe(400);
    });

    it("handles callback and redirects with token and cookies", async () => {
      const state = "valid_flow_state";
      await redisClient.set(
        `google:oauth:state:${state}`,
        JSON.stringify({ codeVerifier: "pkce_verifier_123", createdAt: Date.now() }),
      );

      mockGetToken.mockResolvedValueOnce({
        tokens: { id_token: "mock_jwt_token" },
      });
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_controller_user",
          email: "controller_test@example.com",
          email_verified: true,
          name: "Controller User",
        }),
      });

      const res = await request(app).get(
        `/api/v1/auth/google/callback?code=mock_code&state=${state}`,
      );

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/oauth/success?token=");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("returns JSON when Accept header requests application/json", async () => {
      const state = "json_flow_state";
      await redisClient.set(
        `google:oauth:state:${state}`,
        JSON.stringify({ codeVerifier: "pkce_verifier_123", createdAt: Date.now() }),
      );

      mockGetToken.mockResolvedValueOnce({
        tokens: { id_token: "mock_jwt_token" },
      });
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_json_user",
          email: "json_test@example.com",
          email_verified: true,
          name: "JSON User",
        }),
      });

      const res = await request(app)
        .get(`/api/v1/auth/google/callback?code=mock_code&state=${state}`)
        .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe("json_test@example.com");
    });
  });

  describe("POST /api/v1/auth/google/verify", () => {
    it("validates direct ID token and returns application tokens", async () => {
      mockVerifyIdToken.mockResolvedValueOnce({
        getPayload: () => ({
          sub: "google_verify_direct_user",
          email: "verify_direct@example.com",
          email_verified: true,
          name: "Direct Verified User",
        }),
      });

      const res = await request(app)
        .post("/api/v1/auth/google/verify")
        .send({ idToken: "valid_direct_id_token" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe("verify_direct@example.com");
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("rejects request when neither idToken nor accessToken is supplied", async () => {
      const res = await request(app)
        .post("/api/v1/auth/google/verify")
        .send({});

      expect(res.status).toBe(400);
    });
  });
});

import request from "supertest";
import app from "../../app";
import User from "../../modules/User/user.model";
import {
  deriveCodeChallenge,
  generateRandomToken,
} from "../../modules/OAuth/oauth.utils";
import jwt from "jsonwebtoken";
import env from "../../config/env.config";

describe("OAuth 2.1 Flow Integration Test", () => {
  it("should complete the full OAuth 2.1 authorization code flow with PKCE, replay attack defense, and token rotation", async () => {
    // 1. Create a test user in DB
    const testUser = await User.create({
      name: "OAuth Tester",
      email: `oauth_test_${Date.now()}@example.com`,
      password: "hashed_dummy_password",
      role: "user",
      status: "active",
      isVerified: true,
    });
    const userId = testUser._id.toString();

    // 2. Mint test user session token
    const userToken = jwt.sign(
      { id: userId, role: "user" },
      env.ACCESS_TOKEN,
      { expiresIn: "1h" },
    );
    const redirectUri = "https://example.com/oauth/callback";

    // Step 1: Register an OAuth Client (Confidential)
    const registerRes = await request(app)
      .post("/api/v1/oauth/clients")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        clientName: "My Integration App",
        clientType: "confidential",
        redirectUris: [redirectUri],
        allowedScopes: ["read:profile", "blog:read", "blog:write"],
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.data.clientId).toBeDefined();
    expect(registerRes.body.data.clientSecret).toBeDefined();

    const clientId = registerRes.body.data.clientId;
    const clientSecret = registerRes.body.data.clientSecret;

    // Step 2: Generate PKCE verifier and challenge
    const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk_sample";
    const codeChallenge = deriveCodeChallenge(codeVerifier);
    const state = "xyz_state_123456";

    // 2a: GET /oauth/authorize -> returns promptConsent: true because consent not yet given
    const authRes = await request(app)
      .get("/api/v1/oauth/authorize")
      .set("Authorization", `Bearer ${userToken}`)
      .query({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "read:profile blog:read",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

    expect(authRes.status).toBe(200);
    expect(authRes.body.promptConsent).toBe(true);

    // 2b: POST /oauth/consent -> user approves scopes
    const consentRes = await request(app)
      .post("/api/v1/oauth/consent")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "read:profile blog:read",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        approved: true,
      });

    expect(consentRes.status).toBe(200);
    expect(consentRes.body.redirectUri).toBeDefined();

    // Extract authorization code from redirectUri
    const redirectUrl = new URL(consentRes.body.redirectUri);
    const authCode = redirectUrl.searchParams.get("code")!;
    expect(authCode).toBeDefined();
    expect(redirectUrl.searchParams.get("state")).toBe(state);

    // Step 3: Exchange Code for Access Token and Refresh Token (HTTP Basic Auth)
    const tokenRes = await request(app)
      .post("/api/v1/oauth/token")
      .auth(clientId, clientSecret)
      .send({
        grant_type: "authorization_code",
        code: authCode,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      });

    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.access_token).toBeDefined();
    expect(tokenRes.body.refresh_token).toBeDefined();
    expect(tokenRes.body.token_type).toBe("Bearer");
    expect(tokenRes.body.expires_in).toBe(3600);
    expect(tokenRes.body.scope).toBe("read:profile blog:read");

    const accessToken = tokenRes.body.access_token;
    const refreshToken = tokenRes.body.refresh_token;

    // Step 4: Introspect issued access token
    const introspectRes = await request(app)
      .post("/api/v1/oauth/introspect")
      .send({ token: accessToken });

    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.active).toBe(true);
    expect(introspectRes.body.client_id).toBe(clientId);
    expect(introspectRes.body.sub).toBe(userId);

    // Step 5: Refresh Token Rotation
    const rotateRes = await request(app)
      .post("/api/v1/oauth/token")
      .auth(clientId, clientSecret)
      .send({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

    expect(rotateRes.status).toBe(200);
    expect(rotateRes.body.access_token).toBeDefined();
    expect(rotateRes.body.refresh_token).toBeDefined();
    expect(rotateRes.body.refresh_token).not.toBe(refreshToken); // Rotated!

    // Step 6: Refresh Token Reuse Detection
    // Replaying the old refreshToken MUST trigger token family revocation!
    const reuseOldRefreshRes = await request(app)
      .post("/api/v1/oauth/token")
      .auth(clientId, clientSecret)
      .send({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

    expect(reuseOldRefreshRes.status).toBe(400);
    expect(reuseOldRefreshRes.body.message).toContain("reuse detected");

    // Step 7: Security Check - Authorization Code Replay Attack Detection
    // Attempting to reuse the consumed auth code MUST be rejected and trigger security revocation!
    const replayRes = await request(app)
      .post("/api/v1/oauth/token")
      .auth(clientId, clientSecret)
      .send({
        grant_type: "authorization_code",
        code: authCode,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      });

    expect(replayRes.status).toBe(400);
    expect(replayRes.body.message).toContain("already used");

  });
});

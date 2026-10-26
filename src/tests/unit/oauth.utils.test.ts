import {
  deriveCodeChallenge,
  verifyCodeChallenge,
  validateRedirectUri,
  validateScopes,
  parseBasicAuthHeader,
} from "../../modules/OAuth/oauth.utils";

describe("OAuth Utils", () => {
  describe("PKCE (RFC 7636)", () => {
    it("should correctly compute and verify valid PKCE code_challenge", () => {
      // 43-character valid random verifier
      const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const challenge = deriveCodeChallenge(verifier);

      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe("string");
      expect(verifyCodeChallenge(verifier, challenge)).toBe(true);
    });

    it("should reject mismatching code_verifier", () => {
      const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const wrongVerifier = "aBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const challenge = deriveCodeChallenge(verifier);

      expect(verifyCodeChallenge(wrongVerifier, challenge)).toBe(false);
    });

    it("should reject code_verifier that is too short (< 43 chars)", () => {
      const shortVerifier = "short_verifier_less_than_43_characters";
      const challenge = deriveCodeChallenge(shortVerifier);

      expect(verifyCodeChallenge(shortVerifier, challenge)).toBe(false);
    });

    it("should reject code_verifier with illegal characters", () => {
      const illegalVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk!@#$";
      const challenge = deriveCodeChallenge(illegalVerifier);

      expect(verifyCodeChallenge(illegalVerifier, challenge)).toBe(false);
    });
  });

  describe("Strict Redirect URI Validation", () => {
    const registered = [
      "https://example.com/oauth/callback",
      "http://localhost:3000/callback",
    ];

    it("should accept registered exact matches", () => {
      expect(
        validateRedirectUri("https://example.com/oauth/callback", registered),
      ).toBe(true);
      expect(
        validateRedirectUri("http://localhost:3000/callback", registered),
      ).toBe(true);
    });

    it("should reject path traversal or variations", () => {
      expect(
        validateRedirectUri(
          "https://example.com/oauth/callback/extra",
          registered,
        ),
      ).toBe(false);
      expect(
        validateRedirectUri("https://example.com/oauth", registered),
      ).toBe(false);
    });

    it("should reject URIs containing fragments (#)", () => {
      expect(
        validateRedirectUri(
          "https://example.com/oauth/callback#token=123",
          registered,
        ),
      ).toBe(false);
    });

    it("should reject non-https remote URIs", () => {
      expect(
        validateRedirectUri("http://example.com/oauth/callback", [
          "http://example.com/oauth/callback",
        ]),
      ).toBe(false);
    });
  });

  describe("Scope Validation", () => {
    const allowed = ["read:profile", "blog:read", "blog:write"];

    it("should validate when all requested scopes are allowed", () => {
      const res = validateScopes("read:profile blog:read", allowed);
      expect(res.isValid).toBe(true);
      expect(res.scopes).toEqual(["read:profile", "blog:read"]);
    });

    it("should invalidate when any requested scope is not allowed", () => {
      const res = validateScopes("read:profile admin:all", allowed);
      expect(res.isValid).toBe(false);
    });
  });

  describe("Basic Auth Header Parser", () => {
    it("should parse standard Basic auth credentials", () => {
      const credentials = Buffer.from("my_client_id:my_secret_123").toString(
        "base64",
      );
      const parsed = parseBasicAuthHeader(`Basic ${credentials}`);

      expect(parsed).toEqual({
        clientId: "my_client_id",
        clientSecret: "my_secret_123",
      });
    });

    it("should return null for invalid or missing header", () => {
      expect(parseBasicAuthHeader(undefined)).toBeNull();
      expect(parseBasicAuthHeader("Bearer xyz")).toBeNull();
      expect(parseBasicAuthHeader("Basic invalid-base64-without-colon")).toBeNull();
    });
  });
});

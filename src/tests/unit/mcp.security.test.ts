import {
  extractTokenFromRequest,
  resolveSecurityContext,
  sanitizeBearerToken,
} from "../../mcp/security/mcp.security.context";
import {
  guardToolHandler,
  guardPromptHandler,
} from "../../mcp/security/mcp.security.guard";
import { generateMcpAccessToken } from "../../mcp/security/mcp.security.token";
import AppError from "../../utils/AppError";

describe("MCP Security Layer (Auth & Authz)", () => {
  const originalEnvToken = process.env.MCP_ACCESS_TOKEN;
  const testUserId = "6630f1e2c1234abc567890ef";
  const adminUserId = "6630f1e2c1234abc567890aa";

  let validUserToken: string;
  let validAdminToken: string;

  beforeAll(() => {
    validUserToken = generateMcpAccessToken({ id: testUserId, role: "user" });
    validAdminToken = generateMcpAccessToken({ id: adminUserId, role: "admin" });
  });

  afterEach(() => {
    if (originalEnvToken !== undefined) {
      process.env.MCP_ACCESS_TOKEN = originalEnvToken;
    } else {
      delete process.env.MCP_ACCESS_TOKEN;
    }
  });

  describe("Token Sanitization & Extraction", () => {
    test("sanitizeBearerToken extracts clean token with and without Bearer prefix", () => {
      expect(sanitizeBearerToken("Bearer eyJhbGciOi...")).toBe("eyJhbGciOi...");
      expect(sanitizeBearerToken("bearer   my-token   ")).toBe("my-token");
      expect(sanitizeBearerToken("raw-token")).toBe("raw-token");
      expect(sanitizeBearerToken("")).toBeNull();
      expect(sanitizeBearerToken(null)).toBeNull();
    });

    test("extracts token from extra._meta.token or extra._meta.authorization", () => {
      const extra1 = { _meta: { token: "token-1" } } as any;
      expect(extractTokenFromRequest(undefined, extra1)).toBe("token-1");

      const extra2 = { _meta: { authorization: "Bearer token-2" } } as any;
      expect(extractTokenFromRequest(undefined, extra2)).toBe("token-2");
    });

    test("extracts token from requestInfo headers", () => {
      const extra = {
        requestInfo: { headers: { authorization: "Bearer header-token" } },
      } as any;
      expect(extractTokenFromRequest(undefined, extra)).toBe("header-token");
    });

    test("extracts token from input arguments", () => {
      const input = { token: "arg-token" };
      expect(extractTokenFromRequest(input, undefined)).toBe("arg-token");
    });

    test("falls back to process.env.MCP_ACCESS_TOKEN when no per-request token is present", () => {
      process.env.MCP_ACCESS_TOKEN = "env-token";
      expect(extractTokenFromRequest(undefined, undefined)).toBe("env-token");
    });
  });

  describe("resolveSecurityContext", () => {
    test("throws 401 when token is missing and requireAuth is true", async () => {
      delete process.env.MCP_ACCESS_TOKEN;
      await expect(
        resolveSecurityContext(undefined, undefined, { requireAuth: true }),
      ).rejects.toThrow(AppError);
    });

    test("returns null when token is missing and requireAuth is false", async () => {
      delete process.env.MCP_ACCESS_TOKEN;
      const context = await resolveSecurityContext(undefined, undefined, {
        requireAuth: false,
      });
      expect(context).toBeNull();
    });

    test("throws 401 when token is invalid or corrupted", async () => {
      const extra = { _meta: { token: "corrupt.jwt.token" } } as any;
      await expect(
        resolveSecurityContext(undefined, extra, { requireAuth: true }),
      ).rejects.toThrow("Unauthorized");
    });

    test("resolves user context successfully for valid JWT", async () => {
      const extra = { _meta: { token: validUserToken } } as any;
      const context = await resolveSecurityContext(undefined, extra);
      expect(context).not.toBeNull();
      expect(context?.user.id).toBe(testUserId);
      expect(context?.user.role).toBe("user");
      expect(context?.transport).toBe("stdio");
    });

    test("enforces role authorization: rejects user when admin is required (403)", async () => {
      const extra = { _meta: { token: validUserToken } } as any;
      await expect(
        resolveSecurityContext(undefined, extra, { roles: ["admin"] }),
      ).rejects.toThrow(AppError);
    });

    test("enforces role authorization: allows admin when admin is required", async () => {
      const extra = { _meta: { token: validAdminToken } } as any;
      const context = await resolveSecurityContext(undefined, extra, { roles: ["admin"] });
      expect(context?.user.role).toBe("admin");
    });
  });

  describe("guardToolHandler (Anti-Spoofing & Security Guard)", () => {
    test("returns 401 tool error when unauthorized caller attempts protected tool", async () => {
      delete process.env.MCP_ACCESS_TOKEN;
      const dummyHandler = jest.fn();
      const guarded = guardToolHandler(dummyHandler, {
        requireAuth: true,
        actionName: "test-tool",
      });

      const result = await guarded({}, {} as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("401");
      expect(dummyHandler).not.toHaveBeenCalled();
    });

    test("returns 403 tool error when caller role is insufficient", async () => {
      const dummyHandler = jest.fn();
      const guarded = guardToolHandler(dummyHandler, {
        requireAuth: true,
        roles: ["admin"],
        actionName: "admin-only-tool",
      });

      const extra = { _meta: { token: validUserToken } } as any;
      const result = await guarded({}, extra);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("403");
      expect(dummyHandler).not.toHaveBeenCalled();
    });

    test("anti-spoofing: binds authentic identity and overrides spoofed requesterId and requesterRole", async () => {
      const receivedInput: any = {};
      const toolHandler = jest.fn().mockImplementation(async (input) => {
        Object.assign(receivedInput, input);
        return { content: [{ type: "text", text: "success" }] };
      });

      const guarded = guardToolHandler(toolHandler, {
        requireAuth: true,
        roles: ["user", "admin"],
      });

      const spoofedInput = {
        requesterId: "6630f1e2c1234abc56789099",
        requesterRole: "admin",
        data: "payload",
      };

      const extra = { _meta: { token: validUserToken } } as any;
      const result = await guarded(spoofedInput, extra);

      expect(result.isError).toBeUndefined();
      expect(toolHandler).toHaveBeenCalled();
      expect(receivedInput.requesterId).toBe(testUserId);
      expect(receivedInput.requesterRole).toBe("user");
    });
  });

  describe("guardPromptHandler", () => {
    test("returns denied prompt message when caller lacks required role", async () => {
      const promptHandler = jest.fn();
      const guarded = guardPromptHandler(promptHandler, {
        requireAuth: true,
        roles: ["admin"],
        actionName: "moderate-comments",
      });

      const extra = { _meta: { token: validUserToken } } as any;
      const result = await guarded({}, extra);

      expect(promptHandler).not.toHaveBeenCalled();
      expect(result.messages[0].content.text).toContain("Access denied: Forbidden");
    });

    test("executes prompt callback when authorized", async () => {
      const promptHandler = jest.fn().mockResolvedValue({
        messages: [{ role: "user", content: { type: "text", text: "prompt content" } }],
      });

      const guarded = guardPromptHandler(promptHandler, {
        requireAuth: true,
        roles: ["admin"],
      });

      const extra = { _meta: { token: validAdminToken } } as any;
      const result = await guarded({}, extra);

      expect(promptHandler).toHaveBeenCalled();
      expect(result.messages[0].content.text).toBe("prompt content");
    });
  });
});

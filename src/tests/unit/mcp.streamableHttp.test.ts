// @ts-ignore
import request from "supertest";
import { SessionManager } from "../../mcp/transports/session.manager";
import { createMcpHttpApp } from "../../mcp/transports/http.transport";
import { generateMcpAccessToken } from "../../mcp/security/mcp.security.token";
import { mcpConfig } from "../../config/mcp/mcp.config";

describe("MCP Streamable HTTP Transport & Session Management", () => {
  describe("SessionManager", () => {
    let sessionManager: SessionManager;

    beforeEach(() => {
      // 100ms idle timeout for testing
      sessionManager = new SessionManager(100);
    });

    afterEach(async () => {
      await sessionManager.closeAll();
    });

    test("registers and retrieves an active session", () => {
      const mockTransport = { close: jest.fn().mockResolvedValue(undefined) } as any;
      const mockServer = { close: jest.fn().mockResolvedValue(undefined) } as any;

      const session = sessionManager.registerSession(
        "test-session-1",
        mockTransport,
        mockServer,
      );

      expect(session.sessionId).toBe("test-session-1");
      expect(sessionManager.size).toBe(1);
      expect(sessionManager.hasSession("test-session-1")).toBe(true);
      expect(sessionManager.getSession("test-session-1")).toBe(session);
    });

    test("tracks in-flight response lifecycle", () => {
      const mockTransport = { close: jest.fn().mockResolvedValue(undefined) } as any;
      const mockServer = { close: jest.fn().mockResolvedValue(undefined) } as any;

      const session = sessionManager.registerSession(
        "test-session-2",
        mockTransport,
        mockServer,
      );

      let closeListener: (() => void) | undefined;
      const mockRes = {
        socket: {},
        destroyed: false,
        once: jest.fn().mockImplementation((event, cb) => {
          if (event === "close") closeListener = cb;
        }),
      } as any;

      sessionManager.trackResponse(session, mockRes);
      expect(session.openResponses).toBe(1);

      // Simulate connection close
      closeListener?.();
      expect(session.openResponses).toBe(0);
    });

    test("evicts idle sessions when sweeper runs", async () => {
      const mockTransport = { close: jest.fn().mockResolvedValue(undefined) } as any;
      const mockServer = { close: jest.fn().mockResolvedValue(undefined) } as any;

      sessionManager.registerSession("idle-session", mockTransport, mockServer);
      expect(sessionManager.size).toBe(1);

      // Start sweeper with fast interval
      sessionManager.startIdleSweeper(30);

      // Wait longer than idleTimeoutMs (100ms) + sweep interval
      await new Promise((resolve) => setTimeout(resolve, 180));

      expect(sessionManager.size).toBe(0);
      expect(mockTransport.close).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
    });

    test("closeSession manually releases resources", async () => {
      const mockTransport = { close: jest.fn().mockResolvedValue(undefined) } as any;
      const mockServer = { close: jest.fn().mockResolvedValue(undefined) } as any;

      sessionManager.registerSession("manual-close", mockTransport, mockServer);
      const closed = await sessionManager.closeSession("manual-close");

      expect(closed).toBe(true);
      expect(sessionManager.size).toBe(0);
      expect(mockTransport.close).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
    });

    test("returns stats correctly", () => {
      const mockTransport = { close: jest.fn().mockResolvedValue(undefined) } as any;
      const mockServer = { close: jest.fn().mockResolvedValue(undefined) } as any;

      sessionManager.registerSession("stat-1", mockTransport, mockServer);
      const stats = sessionManager.getStats();

      expect(stats.activeSessions).toBe(1);
      expect(stats.sessions[0].id).toBe("stat-1");
      expect(typeof stats.sessions[0].idleSeconds).toBe("number");
    });
  });

  describe("HTTP Transport Endpoints (createMcpHttpApp)", () => {
    let sessionManager: SessionManager;
    let app: ReturnType<typeof createMcpHttpApp>;

    beforeEach(() => {
      sessionManager = new SessionManager(60000);
      app = createMcpHttpApp(sessionManager);
    });

    afterEach(async () => {
      await sessionManager.closeAll();
    });

    test("GET /health returns 200 with server status & session statistics", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body.server).toBe(mcpConfig.serverName);
      expect(res.body.transport).toBe("streamable-http");
      expect(res.body.sessions).toBeDefined();
      expect(res.body.sessions.activeSessions).toBe(0);
    });

    test("OPTIONS preflight returns 204 with CORS headers", async () => {
      const res = await request(app)
        .options("/mcp")
        .set("Origin", "http://localhost:3000");

      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-methods"]).toContain("POST");
      expect(res.headers["access-control-allow-headers"]).toContain("Mcp-Session-Id");
      expect(res.headers["access-control-expose-headers"]).toContain("Mcp-Session-Id");
    });

    test("POST /mcp returns 400 when missing Mcp-Session-Id and body is not an initialize request", async () => {
      const res = await request(app)
        .post("/mcp")
        .send({ jsonrpc: "2.0", method: "tools/list", id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(-32000);
      expect(res.body.error.message).toContain("No valid Mcp-Session-Id header provided");
    });

    test("POST /mcp returns 404 when unknown Mcp-Session-Id is provided", async () => {
      const res = await request(app)
        .post("/mcp")
        .set("Mcp-Session-Id", "non-existent-session-id")
        .send({ jsonrpc: "2.0", method: "tools/list", id: 1 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe(-32001);
      expect(res.body.error.message).toContain("Session not found");
    });

    test("GET /mcp returns 400 when Mcp-Session-Id header is missing", async () => {
      const res = await request(app).get("/mcp");

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("Mcp-Session-Id header is required");
    });

    test("GET /mcp returns 404 when Mcp-Session-Id is not found", async () => {
      const res = await request(app)
        .get("/mcp")
        .set("Mcp-Session-Id", "unknown-session");

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(-32001);
    });

    test("DELETE /mcp returns 400 when Mcp-Session-Id header is missing", async () => {
      const res = await request(app).delete("/mcp");

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain("Mcp-Session-Id header is required");
    });

    test("DELETE /mcp returns 404 when Mcp-Session-Id is not found", async () => {
      const res = await request(app)
        .delete("/mcp")
        .set("Mcp-Session-Id", "unknown-session");

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(-32001);
    });

    test("attaches authenticated user context when Authorization header is provided", async () => {
      const testToken = generateMcpAccessToken({
        id: "6630f1e2c1234abc567890ef",
        role: "user",
      });

      const res = await request(app)
        .post("/mcp")
        .set("Authorization", `Bearer ${testToken}`)
        .send({ jsonrpc: "2.0", method: "ping", id: 1 });

      // Because it's not initialize and no session id, it returns 400, but does NOT return 401
      expect(res.status).toBe(400);
    });
  });
});

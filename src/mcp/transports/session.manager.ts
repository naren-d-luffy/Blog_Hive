import { ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mcpConfig } from "../../config/mcp/mcp.config";

export interface McpSession {
  sessionId: string;
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  openResponses: number;
  lastActive: number;
  createdAt: number;
}

export class SessionManager {
  private sessions = new Map<string, McpSession>();
  private sweeperTimer?: NodeJS.Timeout;
  private readonly idleTimeoutMs: number;

  constructor(idleTimeoutMs: number = mcpConfig.http.sessionIdleTimeoutMs) {
    this.idleTimeoutMs = idleTimeoutMs;
  }

  /**
   * Registers a newly initialized session.
   */
  public registerSession(
    sessionId: string,
    transport: StreamableHTTPServerTransport,
    server: McpServer,
  ): McpSession {
    const session: McpSession = {
      sessionId,
      transport,
      server,
      openResponses: 0,
      lastActive: Date.now(),
      createdAt: Date.now(),
    };

    this.sessions.set(sessionId, session);

    // Auto-remove when transport itself closes internally
    transport.onclose = () => {
      this.closeSession(sessionId).catch((err) => {
        console.error(`[MCP SessionManager] Error during transport onclose for ${sessionId}:`, err);
      });
    };

    return session;
  }

  /**
   * Retrieves an existing session by ID.
   */
  public getSession(sessionId: string): McpSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Checks if a session ID exists.
   */
  public hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Tracks in-flight HTTP responses and long-lived SSE connections so they are not
   * flagged as idle while actively communicating.
   */
  public trackResponse(session: McpSession, res: ServerResponse): void {
    if (!res.socket || res.destroyed) {
      session.lastActive = Date.now();
      return;
    }

    session.openResponses++;
    session.lastActive = Date.now();

    res.once("close", () => {
      session.openResponses = Math.max(0, session.openResponses - 1);
      session.lastActive = Date.now();
    });
  }

  /**
   * Closes a single session and releases all associated resources.
   */
  public async closeSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.sessions.delete(sessionId);

    try {
      await session.transport.close();
    } catch (err) {
      console.error(`[MCP SessionManager] Error closing transport for session ${sessionId}:`, err);
    }

    try {
      await session.server.close();
    } catch (err) {
      console.error(`[MCP SessionManager] Error closing McpServer for session ${sessionId}:`, err);
    }

    return true;
  }

  /**
   * Closes all active sessions (e.g. on server shutdown).
   */
  public async closeAll(): Promise<void> {
    this.stopIdleSweeper();

    const sessionList = Array.from(this.sessions.values());
    this.sessions.clear();

    for (const session of sessionList) {
      try {
        await session.transport.close();
      } catch (err) {
        console.error(`[MCP SessionManager] Error closing transport for ${session.sessionId}:`, err);
      }

      try {
        await session.server.close();
      } catch (err) {
        console.error(`[MCP SessionManager] Error closing McpServer for ${session.sessionId}:`, err);
      }
    }
  }

  /**
   * Starts background sweeper to evict abandoned or timed-out sessions.
   */
  public startIdleSweeper(sweepIntervalMs: number = 60 * 1000): void {
    if (this.sweeperTimer) return;

    this.sweeperTimer = setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.idleTimeoutMs;

      for (const session of this.sessions.values()) {
        if (session.openResponses === 0 && session.lastActive < cutoff) {
          console.error(
            `[MCP SessionManager] Session ${session.sessionId} expired after ${Math.round((now - session.lastActive) / 1000)}s idle. Evicting.`,
          );
          this.closeSession(session.sessionId).catch((err) => {
            console.error(
              `[MCP SessionManager] Error evicting idle session ${session.sessionId}:`,
              err,
            );
          });
        }
      }
    }, sweepIntervalMs);

    this.sweeperTimer.unref();
  }

  /**
   * Stops the background sweeper.
   */
  public stopIdleSweeper(): void {
    if (this.sweeperTimer) {
      clearInterval(this.sweeperTimer);
      this.sweeperTimer = undefined;
    }
  }

  /**
   * Returns current active session count.
   */
  public get size(): number {
    return this.sessions.size;
  }

  /**
   * Diagnostics stats.
   */
  public getStats(): {
    activeSessions: number;
    sessions: Array<{ id: string; idleSeconds: number; openResponses: number }>;
  } {
    const now = Date.now();
    return {
      activeSessions: this.sessions.size,
      sessions: Array.from(this.sessions.values()).map((s) => ({
        id: s.sessionId,
        idleSeconds: Math.round((now - s.lastActive) / 1000),
        openResponses: s.openResponses,
      })),
    };
  }
}

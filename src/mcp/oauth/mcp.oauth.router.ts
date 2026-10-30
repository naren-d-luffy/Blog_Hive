/**
 * Mounts all OAuth 2.0 Authorization Server endpoints onto the MCP Express app.
 *
 * Registered routes:
 *   GET  /.well-known/oauth-authorization-server  — RFC 8414 discovery
 *   GET  /oauth/authorize                         — Authorization endpoint
 *   GET  /oauth/callback                          — Google redirect callback
 *   POST /oauth/token                             — Token endpoint
 *   POST /oauth/revoke                            — Revocation endpoint (RFC 7009)
 */

import { Router } from "express";
import express from "express";
import {
  discoveryHandler,
  authorizeHandler,
  callbackHandler,
  tokenHandler,
  revokeHandler,
} from "./mcp.oauth.handlers";

export function createOAuthRouter(): Router {
  const router = Router();

  // The token and revoke endpoints accept application/x-www-form-urlencoded
  // (OAuth spec default) as well as JSON.
  router.use(express.urlencoded({ extended: false }));
  router.use(express.json());

  // RFC 8414 — Discovery (must live at root, not under /mcp/oauth/)
  // This is mounted at app level: GET /.well-known/oauth-authorization-server
  // (handled separately in http.transport.ts)

  // OAuth endpoints under /oauth/
  router.get("/authorize", authorizeHandler);
  router.get("/callback",  callbackHandler);
  router.post("/token",    tokenHandler);
  router.post("/revoke",   revokeHandler);

  return router;
}

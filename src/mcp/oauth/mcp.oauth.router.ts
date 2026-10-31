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
  registerClientHandler,
} from "./mcp.oauth.handlers";

export function createOAuthRouter(): Router {
  const router = Router();

  router.use(express.urlencoded({ extended: false }));
  router.use(express.json());

  router.get("/authorize",  authorizeHandler);
  router.get("/callback",   callbackHandler);
  router.post("/token",     tokenHandler);
  router.post("/revoke",    revokeHandler);
  router.post("/register",  registerClientHandler);  // RFC 7591 DCR

  return router;
}

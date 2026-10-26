import express, { Request, Response, NextFunction } from "express";
import { oauthController } from "./oauth.controller";
import { Authenticate } from "../../middleware/auth.middleware";
import { verifyAccessToken } from "../../auth/auth.core";

const router = express.Router();

/**
 * Optional authentication: populates req.user if a valid token is present,
 * without rejecting unauthenticated calls upfront.
 */
const OptionalAuthenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    try {
      const token = auth.slice("Bearer ".length).trim();
      req.user = verifyAccessToken(token);
    } catch {
      // Ignore token failure here; controller will check req.user and prompt login
    }
  }
  next();
};

// 1. Client Management (Requires Authenticated User)
router.post("/clients", Authenticate, oauthController.registerClient);
router.get("/clients", Authenticate, oauthController.listUserClients);

// 2. Authorization Flow
router.get("/authorize", OptionalAuthenticate, oauthController.authorize);
router.post("/consent", Authenticate, oauthController.consent);

// 3. Token Issuance, Revocation, and Introspection
router.post("/token", oauthController.token);
router.post("/revoke", oauthController.revoke);
router.post("/introspect", oauthController.introspect);

export default router;

import { Types } from "mongoose";
import { OAuthClient, OAuthConsent, OAuthRefreshToken } from "./oauth.model";
import {
  IOAuthAuthCodePayload,
  IOAuthClient,
  IOAuthConsent,
  IOAuthRefreshToken,
} from "./oauth.interface";
import { redisClient } from "../../config/redis.config";
import { sha256 } from "./oauth.utils";

export const oauthRepository = {
  // 1. Client Management
  async createClient(data: Partial<IOAuthClient>): Promise<IOAuthClient> {
    return await OAuthClient.create(data);
  },

  async findClientById(clientId: string): Promise<IOAuthClient | null> {
    return await OAuthClient.findOne({ clientId }).select("+clientSecretHash");
  },

  async findClientsByCreator(userId: string): Promise<IOAuthClient[]> {
    return await OAuthClient.find({ createdBy: new Types.ObjectId(userId) });
  },

  // 2. Consent Management
  async findConsent(
    userId: string,
    clientId: string,
  ): Promise<IOAuthConsent | null> {
    return await OAuthConsent.findOne({
      userId: new Types.ObjectId(userId),
      clientId,
    });
  },

  async saveConsent(
    userId: string,
    clientId: string,
    scopes: string[],
  ): Promise<IOAuthConsent> {
    return await OAuthConsent.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), clientId },
      { $addToSet: { scopes: { $each: scopes } } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  },

  async revokeConsent(userId: string, clientId: string): Promise<boolean> {
    const res = await OAuthConsent.deleteOne({
      userId: new Types.ObjectId(userId),
      clientId,
    });
    return res.deletedCount > 0;
  },

  // 3. Authorization Code Management (Atomic Redis with Replay Detection)
  async saveAuthCode(
    code: string,
    payload: IOAuthAuthCodePayload,
    ttlSeconds = 60,
  ): Promise<void> {
    const key = `oauth:code:${code}`;
    await redisClient.set(key, JSON.stringify(payload), "EX", ttlSeconds);
  },

  /**
   * Atomically fetches and deletes the code from Redis.
   * If code existed, also records its hash in an audit set for 10 minutes to detect replay attacks.
   */
  async consumeAuthCode(code: string): Promise<IOAuthAuthCodePayload | null> {
    const key = `oauth:code:${code}`;
    const codeHash = sha256(code);
    const auditKey = `oauth:code_used:${codeHash}`;

    // Redis Lua script for atomic GET + DEL
    const luaScript = `
      local val = redis.call('GET', KEYS[1])
      if val then
        redis.call('DEL', KEYS[1])
      end
      return val
    `;

    const raw = (await redisClient.eval(luaScript, 1, key)) as string | null;

    if (!raw) {
      return null;
    }

    const payload = JSON.parse(raw) as IOAuthAuthCodePayload;

    // Record usage in Redis for 10 minutes to detect replay attacks
    await redisClient.set(
      auditKey,
      JSON.stringify({
        clientId: payload.clientId,
        userId: payload.userId,
        usedAt: Date.now(),
      }),
      "EX",
      600,
    );

    return payload;
  },

  /**
   * Checks if an authorization code was already consumed (replay attack).
   */
  async getConsumedCodeAudit(
    code: string,
  ): Promise<{ clientId: string; userId: string; usedAt: number } | null> {
    const codeHash = sha256(code);
    const auditKey = `oauth:code_used:${codeHash}`;
    const data = await redisClient.get(auditKey);
    return data ? JSON.parse(data) : null;
  },

  // 4. Refresh Token Management (Token Family & Rotation)
  async createRefreshToken(
    data: Partial<IOAuthRefreshToken>,
  ): Promise<IOAuthRefreshToken> {
    return await OAuthRefreshToken.create(data);
  },

  async findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<IOAuthRefreshToken | null> {
    return await OAuthRefreshToken.findOne({ tokenHash });
  },

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await OAuthRefreshToken.updateOne(
      { tokenHash },
      { $set: { isRevoked: true } },
    );
  },

  /**
   * Revokes the ENTIRE token family when refresh token reuse is detected.
   */
  async revokeTokenFamily(familyId: string): Promise<void> {
    await OAuthRefreshToken.updateMany(
      { familyId },
      { $set: { isRevoked: true } },
    );
  },

  /**
   * Revokes all active refresh tokens for a user and client (e.g. after code replay attack).
   */
  async revokeAllClientTokensForUser(
    clientId: string,
    userId: string,
  ): Promise<void> {
    await OAuthRefreshToken.updateMany(
      { clientId, userId: new Types.ObjectId(userId) },
      { $set: { isRevoked: true } },
    );
  },
};

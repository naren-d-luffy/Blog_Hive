import { IToken, TokenType } from "./token.interface";
import Token from "./token.model";

export const tokenRepository = {
  async create(tokenData: Partial<IToken>) {
    return Token.create(tokenData);
  },

  async getByToken(tokenHash: string, type: TokenType) {
    return Token.findOne({
      tokenHash,
      type,
      expiryAt: { $gt: new Date() },
      isUsed: false,
    });
  },

  async markAsUsed(tokenHash: string, type?:TokenType) {
    return Token.updateOne(
      {
        tokenHash,
        type,
        isUsed: false,
        expiryAt: { $gt: new Date() },
      },
      {
        $set: { isUsed: true },
      },
    );
  },

  async invalidateByEmail(email: string, type?: TokenType) {
    return Token.updateMany(
      {
        email,
        isUsed: false,
        ...(type && { type }),
      },
      {
        $set: { isUsed: true },
      },
    );
  },

  async invalidateByUser(userId: string, type?: TokenType) {
    return Token.updateMany(
      {
        user: userId,
        isUsed: false,
        ...(type && { type }),
      },
      {
        $set: { isUsed: true },
      },
    );
  },
};

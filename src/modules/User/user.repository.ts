import User from "./user.model";
import type { IUser } from "./user.interface";
import type { Cursor } from "../../types/cursor.types";

export const userRepository = {
  create(data: Partial<IUser>) {
    return User.create(data);
  },

  findById(id: string) {
    return User.findById(id);
  },

  getSessionById(id: string) {
    return User.findOne({ _id: id, isDeleted: false }).select(
      "+csrfToken +refreshToken +refreshTokenExpiryAt",
    );
  },

  getSessionByRefreshToken(refreshToken: string) {
    return User.findOne({ refreshToken, isDeleted: false }).select(
      "+csrfToken +refreshToken +refreshTokenExpiryAt",
    );
  },

  getPasswordById(id: string) {
    return User.findOne({ _id: id, isDeleted: false }).select("+password");
  },

  findByEmail(email: string) {
    return User.findOne({ email, isDeleted: false }).select("+password");
  },

  findAll(cursor: Cursor | undefined, limit: number) {
    const filter: any = { isDeleted: false };

    if (cursor) {
      filter.$or = [
        {
          createdAt: {
            $lt: new Date(cursor.createdAt),
          },
        },
        {
          createdAt: new Date(cursor.createdAt),
          _id: { $lt: cursor.id },
        },
      ];
    }

    return User.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit);
  },

  update(id: string, data: Partial<IUser>) {
    return User.findOneAndUpdate({ _id: id, isDeleted: false }, data, {
      returnDocument: "after",
      runValidators: true,
    });
  },

  softDelete(id: string) {
    return User.findOneAndUpdate(
      { _id: id },
      { isDeleted: true, deletedDate: new Date() },
      { returnDocument: "after" },
    );
  },

  save(user: IUser) {
    return user.save();
  },
};

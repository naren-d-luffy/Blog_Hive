import Admin from "./admin.model";
import { IAdmin } from "./admin.interface";
import { Cursor } from "../../types/cursor.types";

export const adminRepository = {
  create(data: Partial<IAdmin>) {
    return Admin.create(data);
  },

  findById(id: string) {
    return Admin.findById(id);
  },

  getSessionById(id: string) {
  return Admin.findOne({ _id: id, isDeleted: false }).select("+csrfToken +refreshToken +refreshTokenExpiryAt");
  },

  getSessionByRefreshToken(refreshToken: string) {
    return Admin.findOne({ refreshToken, isDeleted: false }).select("+csrfToken +refreshToken +refreshTokenExpiryAt");
  },

  getPasswordById(id: string) {
    return Admin.findOne({ _id:id, isDeleted: false }).select("+password");
  },

  findByEmailWithPassword(email: string) {
    return Admin.findOne({ email, isDeleted: false }).select("+password");
  },

  findByEmail(email: string) {
    return Admin.findOne({ email, isDeleted: false });
  },

  findAll(cursor: Cursor | null = null, limit: number) {
    const filter: any = {isdeleted : false};

    if(cursor){
      filter.$or = [
        {
          createdAt: {
            $lt: new Date(cursor.createdAt),
          }
        },
        {
          createdAt: new Date(cursor.createdAt),
          _id: { $lt: cursor.id }
        }
      ]
    }

    return Admin.find(filter).sort({ createdAt:-1, _id:-1 }).limit(limit);
  },

  update(id: string, data: Partial<IAdmin>) {
    return Admin.findOneAndUpdate({ _id: id, isDeleted: false }, data, {
      returnDocument: "after",
      runValidators: true,
    });
  },

  softDelete(id: string) {
    return Admin.findOneAndUpdate(
      {_id:id},
      { isDeleted: true, deletedDate: new Date() },
      { returnDocument: "after" },
    );
  },

  save(admin: IAdmin) {
    return admin.save();
  },
};

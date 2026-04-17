import Admin from "./admin.model";
import { IAdmin } from "./admin.interface";

export const adminRepository = {
  create(data: Partial<IAdmin>) {
    return Admin.create(data);
  },

  findById(id: string) {
    return Admin.findById(id);
  },

  getSessionById(id: string) {
  return Admin.findOne({ _id: id, isDeleted: false }).select("+csrfToken +refreshToken");
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

  findAll(skip: number, limit: number) {
    return Admin.find({ isDeleted: false })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  },

  count() {
    return Admin.countDocuments({ isDeleted: false });
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

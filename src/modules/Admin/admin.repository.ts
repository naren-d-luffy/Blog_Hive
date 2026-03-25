import Admin from "./admin.model";
import { IAdmin } from "./admin.interface";

export const adminRepository = {
  create(data: Partial<IAdmin>) {
    return Admin.create(data);
  },

  findById(id: string) {
    return Admin.findById(id);
  },

  findByEmail(email: string) {
    return Admin.findOne({ email, isDeleted: false }).select("+password");
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
    return Admin.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  },

  save(admin: IAdmin) {
    return admin.save();
  },
};

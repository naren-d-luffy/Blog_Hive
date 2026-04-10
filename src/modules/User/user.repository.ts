import User from "./user.model";
import { IUser } from "./user.interface";

export const userRepository = {
  create(data: Partial<IUser>) {
    return User.create(data);
  },

  findById(id: string) {
    return User.findById(id);
  },

  getPasswordById(id:string){
    return User.findOne({id,isdeleted:false}).select("+password")
  },

  findByEmail(email: string) {
    return User.findOne({ email, isDeleted: false }).select("+password");
  },

  findAll(skip: number, limit: number) {
    return User.find({ isDeleted: false })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
  },

  count() {
    return User.countDocuments({ isDeleted: false });
  },

  update(id: string, data: Partial<IUser>) {
    return User.findByIdAndUpdate({ _id:id, isDeleted: false }, data, {
      returnDocument: "after",
      runValidators: true,
    });
  },

  softDelete(id: string) {
    return User.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedDate: new Date() },
      { returnDocument: "after" },
    );
  },

  save(user: IUser) {
    return user.save();
  },
};

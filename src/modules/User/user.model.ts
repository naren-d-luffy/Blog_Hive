import mongoose, { Schema } from "mongoose";
import { IUser } from "./user.interface";

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, default: "user", enum:["user"] },
    status: { type: String, enum: ["active", "inactive"], default: "active", required: true,},

    csrfToken: {type:String},
    refreshToken: { type: String },
    isDeleted: { type: Boolean, default: false },
    deletedDate: { type: Date },
    lastLogin: { type: Date },
    failedLoginAttempt: { type: Number, default: 0 },
    lastPasswordChange: { type: Date },
    lockUntil: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({email:1},{unique:true});

const User = mongoose.model<IUser>("User", userSchema);
export default User;

import mongoose, { Schema } from "mongoose";
import { IUser } from "./user.interface";

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String },
    avatar: { type: String },
    role: { type: String, default: "user", enum: ["user"] },
    status: { type: String, enum: ["active", "inactive"], default: "active", required: true },
    isVerified: { type: Boolean, default: false },

    csrfToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    refreshTokenExpiryAt: { type: Date, select: false },
    isDeleted: { type: Boolean, default: false },
    deletedDate: { type: Date },
    lastLogin: { type: Date },
    failedLoginAttempt: { type: Number, default: 0 },
    lastPasswordChange: { type: Date },
    lockUntil: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ isDeleted: 1, createdAt: -1, _id: -1 });

const User = mongoose.model<IUser>("User", userSchema);
export default User;

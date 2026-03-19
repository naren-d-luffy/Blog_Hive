import mongoose, { Schema, Document } from "mongoose";

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin";
  status: "active" | "inactive";

  refreshToken: string;
  isDeleted: boolean;
  deletedDate: Date;
  lastLogin: Date;
  failedLoginAttempt: number;
  lastPasswordChange: Date;
  lockUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, default: "admin" },
    status: { type: String, enum: ["active", "inactive"], default: "active", required: true,},

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

const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
export default Admin;

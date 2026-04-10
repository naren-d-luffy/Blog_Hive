import mongoose, { Schema } from "mongoose";
import { IAdmin } from "./admin.interface";

const adminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, default: "admin" },
    status: { type: String, enum: ["active", "inactive"], default: "active", required: true,},

    csrfToken: {type : String},
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

adminSchema.index({email:1},{unique:true});

const Admin = mongoose.model<IAdmin>("Admin", adminSchema);
export default Admin;

import { Document } from "mongoose";

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin";
  status: "active" | "inactive";

  refreshToken: string | null;
  isDeleted: boolean;
  deletedDate: Date;
  lastLogin: Date;
  failedLoginAttempt: number;
  lastPasswordChange: Date;
  lockUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
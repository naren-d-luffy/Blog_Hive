import { Document } from "mongoose";

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
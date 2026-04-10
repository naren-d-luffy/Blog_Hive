import { Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "user";
  status: "active" | "inactive";

  csrfToken: string | null;
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
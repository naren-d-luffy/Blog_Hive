import { Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  authProvider?: "local" | "google";
  googleId?: string | null;
  avatar?: string | null;
  role: "user";
  status: "active" | "inactive";
  isVerified: boolean;

  csrfToken: string | null;
  refreshToken: string | null;
  refreshTokenExpiryAt: Date;
  isDeleted: boolean;
  deletedDate: Date;
  lastLogin: Date;
  failedLoginAttempt: number;
  lastPasswordChange: Date;
  lockUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
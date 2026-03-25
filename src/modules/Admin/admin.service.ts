import env from "../../config/env.config";
import { adminRepository } from "./admin.repository";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import AppError from "../../utils/AppError";
import { IAdmin } from "./admin.interface";
import { AdminLoginInput, CreateAdminInput } from "./admin.validator";
import { AuthUser } from "../../types/auth.types";

const ACCESS_SECRET = env.ACCESS_TOKEN;
const REFRESH_SECRET = env.REFRESH_TOKEN;
const FAILURE_COUNT = env.LOGIN_FAILURE_COUNT;
const LOCK_UNTIL_TIME = env.LOCK_UNTIL_TIME;

export const adminService = {
  checkId(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid Admin Id", 400);
    }
  },

  sanitizeAdmin(admin: Partial<IAdmin>) {
    return {
      id: admin?._id,
      name: admin?.name,
      email: admin?.email,
      role: admin?.role,
      status: admin?.status,
      lastLogin: admin?.lastLogin,
    };
  },

  async createAdmin(admin: CreateAdminInput) {
    const hashed = await bcrypt.hash(admin.password, 10);
    const newAdmin = await adminRepository.create({
      ...admin,
      password: hashed,
      role: "admin",
      status: "active",
    });

    return this.sanitizeAdmin(newAdmin);
  },

  async loginAdmin(credentials: AdminLoginInput) {
    const { email, password } = credentials;

    const admin = await adminRepository.findByEmail(email);

    if (!admin) throw new AppError("Invalid credentials", 401);
    if (admin.status === "inactive")
      throw new AppError("Admin is Inactive, contact Super Admin", 403);
    if (admin.lockUntil && admin.lockUntil.getTime() > Date.now())
      throw new AppError("Account is locked, Try again later", 403);

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      admin.failedLoginAttempt += 1;

      if (admin.failedLoginAttempt >= FAILURE_COUNT) {
        admin.lockUntil = new Date(Date.now() + LOCK_UNTIL_TIME);
      }
      await adminRepository.save(admin);
      throw new AppError("Invalid Credentials", 401);
    }

    admin.lockUntil = null;
    admin.failedLoginAttempt = 0;
    admin.lastLogin = new Date();

    const payload:AuthUser = {id: admin.id, role:admin.role}

    const accessToken = jwt.sign(payload,ACCESS_SECRET,{expiresIn:"30m"});
    const refreshToken = jwt.sign(payload,REFRESH_SECRET,{expiresIn:"7d"});
    const hashedRefresh = await bcrypt.hash(refreshToken,10);
    admin.refreshToken = hashedRefresh;
    await adminRepository.save(admin);

    const safeData = this.sanitizeAdmin(admin);
    
    return {accessToken, refreshToken, safeData};
  },

  async logoutAdmin(id:string){
    this.checkId(id);

    const admin = await adminRepository.findById(id);
    if(!admin) throw new AppError("Admin not found or deleted", 404);
    admin.refreshToken= null;
    await adminRepository.save(admin);
    return;
  }
};
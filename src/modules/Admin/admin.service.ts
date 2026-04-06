import env from "../../config/env.config";
import { adminRepository } from "./admin.repository";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AppError from "../../utils/AppError";
import { IAdmin } from "./admin.interface";
import { AdminLoginInput, CreateAdminInput } from "./admin.validator";
import { AuthUser } from "../../types/auth.types";
import checkId from "../../utils/CheckId"
import redisClient from "../../config/redis.config";

const ACCESS_SECRET = env.ACCESS_TOKEN;
const REFRESH_SECRET = env.REFRESH_TOKEN;
const FAILURE_COUNT = env.LOGIN_FAILURE_COUNT;
const LOCK_UNTIL_TIME = env.LOCK_UNTIL_TIME * 60 * 1000;

export const adminService = {
  sanitizeAdmin(admin: Partial<IAdmin> | null) {
    if (!admin) return null;
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

  async findAllAdmin(page: number, limit: number) {
    const cacheKey = `admins:${page}:${limit}`;

    const cached = await redisClient.get(cacheKey);
    if(cached){
      console.log("Cache hit");
      return JSON.parse(cached);
    }
    
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      adminRepository.findAll(skip, limit),
      adminRepository.count(),
    ]);
    const sanitizedData = data.map((admin) => this.sanitizeAdmin(admin));

    const result = {
      sanitizedData,
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    };

    await redisClient.set(cacheKey,JSON.stringify(result),{"EX": 60});
    return result;
  },

  async findAdminById(id: string) {
    checkId(id);

    const cacheKey = `admin:${id}`
    const cached = await redisClient.get(cacheKey);
    if(cached){
      console.log("Cache hit");
      return JSON.parse(cached);
    }

    const result = await adminRepository.findById(id);
    const sanitizedResult = this.sanitizeAdmin(result);

    await redisClient.set(cacheKey,JSON.stringify(sanitizedResult),{"EX":60});
    return sanitizedResult;
  },

  async loginAdmin(credentials: AdminLoginInput) {
    const { email, password } = credentials;

    const admin = await adminRepository.findByEmail(email);

    if (!admin) throw new AppError("Invalid credentials", 401);

    if (admin.status === "inactive") {
      throw new AppError("Admin is Inactive, contact Super Admin", 403);
    }

    if (admin.lockUntil && admin.lockUntil.getTime() > Date.now()) {
      throw new AppError("Account is locked, Try again later", 403);
    }

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

    const payload: AuthUser = { id: admin.id, role: admin.role };

    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    admin.refreshToken = hashedRefresh;
    await adminRepository.save(admin);

    const safeData = this.sanitizeAdmin(admin);

    return { accessToken, refreshToken, safeData };
  },

  async logoutAdmin(id: string) {
    checkId(id);

    const admin = await adminRepository.findById(id);
    if (!admin) throw new AppError("Admin not found or deleted", 404);
    admin.refreshToken = null;
    await adminRepository.save(admin);
    return;
  },

  async updateStatus(id: string, status: "active" | "inactive") {
    checkId(id);
    const updated = await adminRepository.update(id, { status });
    if (!updated) throw new AppError("Error updating the Admin status", 400);
    const sanitizedData = this.sanitizeAdmin(updated);
    await redisClient.del(`admin:${id}`);
    return sanitizedData;
  },

  async softDelete(id: string) {
    checkId(id);
    const deleted = await adminRepository.softDelete(id);
    if (!deleted) throw new AppError("Error Deleting Admin", 400);
    const sanitizedAdmin = this.sanitizeAdmin(deleted);
    await redisClient.del(`admin:${id}`);
    return sanitizedAdmin;
  },

  async postRefresh(token: string) {
    let decode;
    try {
      decode = jwt.verify(token, env.REFRESH_TOKEN) as AuthUser;
    } catch (error) {
      throw new AppError("Invalid or expired refresh token", 403);
    }

    const adminDoc = (await adminRepository.findById(decode.id));
    if (!adminDoc) throw new AppError("Admin not found", 404);

    if (!adminDoc.refreshToken) {
      throw new AppError("RefreshToken Expired", 403);
    }

    const match = await bcrypt.compare(token, adminDoc.refreshToken);
    if (!match) throw new AppError("Refresh token mismatch", 403);

    let payload: AuthUser = { id: adminDoc.id, role: adminDoc.role };

    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    
    await adminRepository.update(adminDoc.id, {
      refreshToken: hashedRefresh,
    });

    const safeData = this.sanitizeAdmin(adminDoc);

    return { accessToken, refreshToken, safeData };
  },
};

import env from "../../config/env.config";
import { adminRepository } from "./admin.repository";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AppError from "../../utils/AppError";
import { IAdmin } from "./admin.interface";
import { AdminLoginInput, CreateAdminInput } from "./admin.validator";
import { AuthUser } from "../../types/auth.types";
import checkId from "../../utils/CheckId";
import redisClient from "../../config/redis.config";
import generateToken from "../../utils/generateToken";

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
    if (cached) {
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

    await redisClient.set(cacheKey, JSON.stringify(result), { EX: 60 });
    return result;
  },

  async findAdminById(id: string) {
    checkId(id);

    const cacheKey = `admin:${id}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("Cache hit");
      return JSON.parse(cached);
    }

    const result = await adminRepository.findById(id);
    const sanitizedResult = this.sanitizeAdmin(result);

    await redisClient.set(cacheKey, JSON.stringify(sanitizedResult), {
      EX: 60,
    });
    return sanitizedResult;
  },

  async loginAdmin(credentials: AdminLoginInput) {
    const { email, password } = credentials;

    const admin = await adminRepository.findByEmailWithPassword(email);

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

    //CSFR Handling
    const csrfToken = generateToken({ length: 32 });
    const hashedCsrf = await bcrypt.hash(csrfToken, 10);
    admin.csrfToken = hashedCsrf;

    //Access and Refresh Token Handling
    const payload: AuthUser = { id: admin.id, role: admin.role };

    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    admin.refreshToken = hashedRefresh;
    await adminRepository.save(admin);

    const safeData = this.sanitizeAdmin(admin);

    return { accessToken, refreshToken, safeData, csrfToken };
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

  async postRefresh(admin: { id: string; role: "admin" }) {
    //CSRF Handler
    const csrfToken = generateToken({ length: 32 });
    const hashedCsrf = await bcrypt.hash(csrfToken, 10);

    //Access and Refresh Handler
    let payload: AuthUser = { id: admin.id, role: admin.role };

    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);

    await adminRepository.update(admin.id, {
      refreshToken: hashedRefresh,
      csrfToken: hashedCsrf,
    });

    return { accessToken, refreshToken, csrfToken };
  },

  async changePassword(id: string,currentPassword: string,newPassword: string) {
    const admin = await adminRepository.getPasswordById(id);
    if (!admin) throw new AppError("Admin not found", 400);

    const isMatch = await bcrypt.compare(currentPassword, admin.password);

    if (!isMatch) {
      throw new AppError("Invalid current password", 400);
    }

    const isSameAsOld = await bcrypt.compare(newPassword, admin.password);

    if (isSameAsOld) {
      throw new AppError("New password cannot be same as old password", 400);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const updatedAdmin = await adminRepository.update(id, {
      password: hashed,
      refreshToken: null,
      csrfToken: null,
      lockUntil: null,
      failedLoginAttempt: 0,
      lastLogin: new Date(),
    });
    const sanitized = this.sanitizeAdmin(updatedAdmin);
    return sanitized;
  },
};

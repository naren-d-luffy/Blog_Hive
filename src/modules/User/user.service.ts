import env from "../../config/env.config";
import { userRepository } from "./user.repository";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import AppError from "../../utils/AppError";
import { IUser } from "./user.interface";
import { UserLoginInput, CreateUserInput } from "./user.validator";
import { AuthUser } from "../../types/auth.types";

const ACCESS_SECRET = env.ACCESS_TOKEN;
const REFRESH_SECRET = env.REFRESH_TOKEN;
const FAILURE_COUNT = env.LOGIN_FAILURE_COUNT;
const LOCK_UNTIL_TIME = env.LOCK_UNTIL_TIME * 60 * 1000;

export const userService = {
  checkId(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid Id", 400);
    }
  },

  sanitizeUser(user: Partial<IUser> | null) {
    if (!user) return null;
    return {
      id: user?._id,
      name: user?.name,
      email: user?.email,
      role: user?.role,
      status: user?.status,
      lastLogin: user?.lastLogin,
    };
  },

  async createUser(user: CreateUserInput) {
    const hashed = await bcrypt.hash(user.password, 10);
    const newUser = await userRepository.create({
      ...user,
      password: hashed,
      role: "user",
      status: "active",
    });

    return this.sanitizeUser(newUser);
  },

  async findAllUser(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      userRepository.findAll(skip, limit),
      userRepository.count(),
    ]);
    const sanitizedData = data.map((user) => this.sanitizeUser(user));

    return {
      sanitizedData,
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    };
  },

  async findUserById(id: string) {
    this.checkId(id);
    const result = await userRepository.findById(id);
    const sanitizedResult = this.sanitizeUser(result);
    return sanitizedResult;
  },

  async loginUser(credentials: UserLoginInput) {
    const { email, password } = credentials;

    const user = await userRepository.findByEmail(email);

    if (!user) throw new AppError("Invalid credentials", 401);

    if (user.status === "inactive") {
      throw new AppError("User is Inactive, contact Super User", 403);
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      throw new AppError("Account is locked, Try again later", 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempt += 1;

      if (user.failedLoginAttempt >= FAILURE_COUNT) {
        user.lockUntil = new Date(Date.now() + LOCK_UNTIL_TIME);
      }
      await userRepository.save(user);
      throw new AppError("Invalid Credentials", 401);
    }

    user.lockUntil = null;
    user.failedLoginAttempt = 0;
    user.lastLogin = new Date();

    const payload: AuthUser = { id: user.id, role: user.role };

    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = hashedRefresh;
    await userRepository.save(user);

    const safeData = this.sanitizeUser(user);

    return { accessToken, refreshToken, safeData };
  },

  async logoutUser(id: string) {
    this.checkId(id);

    const user = await userRepository.findById(id);
    if (!user) throw new AppError("User not found or deleted", 404);
    user.refreshToken = null;
    await userRepository.save(user);
    return;
  },

  async updateStatus(id: string, status: "active" | "inactive") {
    this.checkId(id);
    const updated = await userRepository.update(id, { status });
    if (!updated) throw new AppError("Error updating the User status", 400);
    const sanitizedData = this.sanitizeUser(updated);
    return sanitizedData;
  },

  async softDelete(id: string) {
    this.checkId(id);
    const deleted = await userRepository.softDelete(id);
    if (!deleted) throw new AppError("Error Deleting User", 400);
    const sanitizedUser = this.sanitizeUser(deleted);
    return sanitizedUser;
  },

  async postRefresh(token: string) {
    let decode;
    try {
      decode = jwt.verify(token, env.REFRESH_TOKEN) as AuthUser;
    } catch (error) {
      throw new AppError("Invalid or expired refresh token", 403);
    }

    const userDoc = (await userRepository.findById(decode.id));
    if (!userDoc) throw new AppError("User not found", 404);

    if (!userDoc.refreshToken) {
      throw new AppError("RefreshToken Expired", 403);
    }

    const match = await bcrypt.compare(token, userDoc.refreshToken);
    if (!match) throw new AppError("Refresh token mismatch", 403);

    let payload: AuthUser = { id: userDoc.id, role: userDoc.role };

    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    
    await userRepository.update(userDoc.id, {
      refreshToken: hashedRefresh,
    });

    const safeData = this.sanitizeUser(userDoc);

    return { accessToken, refreshToken, safeData };
  },
};

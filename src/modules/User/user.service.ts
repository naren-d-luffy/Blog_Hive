import env from "../../config/env.config";
import { userRepository } from "./user.repository";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AppError from "../../utils/AppError";
import { IUser } from "./user.interface";
import { UserLoginInput, CreateUserInput } from "./user.validator";
import { AuthUser } from "../../types/auth.types";
import checkId from "../../utils/CheckId";
import redisClient from "../../config/redis.config";
import generateToken from "../../utils/generateToken";

const ACCESS_SECRET = env.ACCESS_TOKEN;
const REFRESH_SECRET = env.REFRESH_TOKEN;
const FAILURE_COUNT = env.LOGIN_FAILURE_COUNT;
const LOCK_UNTIL_TIME = env.LOCK_UNTIL_TIME * 60 * 1000;

export const userService = {
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
    const cacheKey = `user:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      userRepository.findAll(skip, limit),
      userRepository.count(),
    ]);
    const sanitizedData = data.map((user) => this.sanitizeUser(user));

    const result = {
      sanitizedData,
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    };

    await redisClient.set(cacheKey, JSON.stringify(result), { EX: 60 });
  },

  async findUserById(id: string) {
    checkId(id);
    const cacheKey = `user:${id}`;
    const cached = await redisClient.get(cacheKey);
    if(cached){
      return JSON.parse(cached);
    }

    const result = await userRepository.findById(id);
    const sanitizedResult = this.sanitizeUser(result);

    await redisClient.set(cacheKey, JSON.stringify(sanitizedResult), {"EX":60});

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

    //CSRF Handler
    const csrfToken = generateToken({length:32});
    const hashedCsrf = await bcrypt.hash(csrfToken,10);
    user.csrfToken = hashedCsrf;

    //Access and Refresh Handler
    const payload: AuthUser = { id: user.id, role: user.role };

    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    user.refreshToken = hashedRefresh;
    await userRepository.save(user);

    const safeData = this.sanitizeUser(user);

    return { accessToken, refreshToken, safeData, csrfToken };
  },

  async logoutUser(id: string) {
    checkId(id);

    const user = await userRepository.findById(id);
    if (!user) throw new AppError("User not found or deleted", 404);
    user.refreshToken = null;
    await userRepository.save(user);
    return;
  },

  async updateStatus(id: string, status: "active" | "inactive") {
    checkId(id);
    const updated = await userRepository.update(id, { status });
    if (!updated) throw new AppError("Error updating the User status", 400);
    const sanitizedData = this.sanitizeUser(updated);
    await redisClient.del(`user:${id}`);
    return sanitizedData;
  },

  async softDelete(id: string) {
    checkId(id);
    const deleted = await userRepository.softDelete(id);
    if (!deleted) throw new AppError("Error Deleting User", 400);
    const sanitizedUser = this.sanitizeUser(deleted);
    await redisClient.del(`user:${id}`);
    return sanitizedUser;
  },

  async postRefresh(admin:{id:string, role:"user"}) {

    const csrfToken = generateToken({length:32});
    const hashedCsrf = await bcrypt.hash(csrfToken,10);
    
    let payload: AuthUser = { id: admin.id, role: admin.role };

    const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "30m" });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);

    await userRepository.update(admin.id, {
      refreshToken: hashedRefresh,
      csrfToken: hashedCsrf
    });

    return { accessToken, refreshToken, csrfToken };
  },
};

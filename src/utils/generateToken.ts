import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import AppError from "./AppError";
import env from "../config/env.config";

type TokenOptions = {
    length ?: number,
    encoding?: "hex" | "base64url",
    prefix?:string,
};

const HASH_TOKEN = env.HASH_TOKEN

export const generateToken = (options: TokenOptions={}):string => {
    const {
        length= 32,
        encoding= "base64url",
        prefix =""
    } = options

    if(length <= 0){
        throw new AppError("Token Length must be greater than 0", 400);
    }

    const buffer = randomBytes(length);

    let token: string;

    switch(encoding){
        case "hex":
            token = buffer.toString("hex");
            break;
        case "base64url":
            token = buffer
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");
            break;
        default:
            throw new AppError(`unsupported encoding:${encoding}`,400);
    }
    return prefix ? `${prefix}${token}` : token;
}

export const hashToken = (token : string):string => {
    if(!token){
        throw new AppError("Token is required",400);
    }

    const hashedToken = createHmac("sha256", HASH_TOKEN).update(token, "utf8").digest("hex")
    return hashedToken;
}

export const verifyToken = (token:string, storedHash:string): boolean => {
    if(!token || !storedHash) return false;

    const hashedToken = hashToken(token);

    const hasedBuffer = Buffer.from(hashedToken,"hex");
    const storedBuffer = Buffer.from(storedHash,"hex");

    if(hasedBuffer.length !== storedBuffer.length) return false;

    return timingSafeEqual(hasedBuffer, storedBuffer);
}
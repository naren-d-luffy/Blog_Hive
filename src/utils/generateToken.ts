import { randomBytes } from "crypto";
import AppError from "./AppError";

type TokenOptions = {
    length ?: number,
    encoding?: "hex" | "base64url",
    prefix?:string,
};

const generateToken = (options: TokenOptions={}):string => {
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

export default generateToken
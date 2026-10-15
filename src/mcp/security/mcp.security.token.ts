import jwt from "jsonwebtoken";
import env from "../../config/env.config";
import type { Role } from "../../types/auth.types";
import checkId from "../../utils/CheckId";

const ACCESS_SECRET = env.ACCESS_TOKEN;

export function generateMcpAccessToken(
  user: { id: string; role: Role },
  expiresIn: string | number = "2h",
): string {
  checkId(user.id);
  return jwt.sign({ id: user.id, role: user.role }, ACCESS_SECRET, {
    expiresIn: expiresIn as any,
  });
}

import { AuthUser, Role } from "../../types/auth.types";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

export interface McpSecurityContext {
  user: AuthUser;
  token: string;
  transport: "stdio" | "http";
}

export interface McpSecurityOptions {
  requireAuth?: boolean;
  roles?: Role[];
  authorize?: (
    user: AuthUser,
    input: any,
    extra?: RequestHandlerExtra<any, any>,
  ) => void | Promise<void>;
  actionName?: string;
}

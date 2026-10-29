import { AuthUser } from "../auth.types";
import { IAdmin } from "../../modules/Admin/admin.interface";
import { IUser } from "../../modules/User/user.interface";

declare module "express-serve-static-core" {
  interface Request {
    log: any;
    user?: AuthUser;
    authEntity?: IUser | IAdmin;
    logMetadata?: Record<string, any>;
  }
}
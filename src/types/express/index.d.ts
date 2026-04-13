import { AuthUser } from "../auth.types";
import { IAdmin } from "../../modules/Admin/admin.interface";
import { IUser } from "../../modules/User/user.interface";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
    authEntity?: IUser | IAdmin;
  }
}
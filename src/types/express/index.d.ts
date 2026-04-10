export {};

  import { IAdmin } from "../../modules/Admin/admin.interface";
  import { IUser } from "../../modules/User/user.interface";
import { AuthUser } from "../auth.types";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      authEntity?: IUser | IAdmin;
    }
  }
}
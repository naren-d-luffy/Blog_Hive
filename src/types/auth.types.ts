export type Role = "admin" | "user";

export interface AuthUser{
    id:string,
    role:Role
}
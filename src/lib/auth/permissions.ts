import type { AccessControl, Role } from "better-auth/plugins/access";
import { authAccessControl, authRoles } from "./roles";

export const ac: AccessControl = authAccessControl;
export const admin: Role = authRoles.admin as Role;
export const user: Role = authRoles.user as Role;

export function getAdminPluginConfig() {
  return {
    ac,
    roles: {
      admin,
      user,
    },
  };
}

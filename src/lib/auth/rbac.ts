import { createAccessControl } from "better-auth/plugins/access";
import type { AccessControl, Role } from "better-auth/plugins/access";

// --- Statements ---

export const authStatements = {
  user: [
    "create",
    "list",
    "get",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "update",
  ],
  session: ["list", "revoke", "delete"],
} as const;

// --- Access control & roles ---

export const ac: AccessControl = createAccessControl(authStatements);

export const authRoles = {
  admin: ac.newRole({
    user: [...authStatements.user],
    session: [...authStatements.session],
  }),
  user: ac.newRole({}),
} as const;

export type AuthRoleName = keyof typeof authRoles;

export const adminRole: Role = authRoles.admin as Role;
export const userRole: Role = authRoles.user as Role;

// --- Plugin config factory (shared by server init & auth client) ---

export function getAdminPluginConfig() {
  return {
    ac,
    roles: {
      admin: adminRole,
      user: userRole,
    },
  };
}

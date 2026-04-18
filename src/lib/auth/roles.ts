import { createAccessControl } from "better-auth/plugins/access";

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

export const authAccessControl = createAccessControl(authStatements);

export const authRoles = {
  admin: authAccessControl.newRole({
    user: [...authStatements.user],
    session: [...authStatements.session],
  }),
  user: authAccessControl.newRole({}),
} as const;

export type AuthRoleName = keyof typeof authRoles;

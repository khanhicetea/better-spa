import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { getAdminPluginConfig } from "./permissions";

const authClient = createAuthClient({
  // baseURL: env.VITE_BASE_URL,
  plugins: [adminClient(getAdminPluginConfig())],
});

export default authClient;

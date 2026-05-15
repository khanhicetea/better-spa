import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { env } from "@/env/client";
import { getAdminPluginConfig } from "./rbac";

// --- Auth client singleton ---

const authClient = createAuthClient({
  // baseURL: env.VITE_BASE_URL,
  plugins: [adminClient(getAdminPluginConfig())],
});

export default authClient;

// --- Social provider helpers ---

export const SOCIAL_PROVIDER_LABELS = {
  github: "GitHub",
  google: "Google",
} as const;

export type SocialProvider = keyof typeof SOCIAL_PROVIDER_LABELS;

export const enabledSocialProviders: Record<SocialProvider, boolean> = {
  github: env.VITE_AUTH_GITHUB_ENABLED,
  google: env.VITE_AUTH_GOOGLE_ENABLED,
};

export function isSocialProviderEnabled(provider: SocialProvider) {
  return enabledSocialProviders[provider];
}

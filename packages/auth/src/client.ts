import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { getAdminPluginConfig } from "./rbac";

export const SOCIAL_PROVIDER_LABELS = {
  github: "GitHub",
  google: "Google",
} as const;

export type SocialProvider = keyof typeof SOCIAL_PROVIDER_LABELS;

export type AuthClientOptions = {
  baseURL?: string;
  enabledSocialProviders?: Partial<Record<SocialProvider, boolean>>;
};

export function createBetterSpaAuthClient(options: AuthClientOptions = {}) {
  const client = createAuthClient({
    baseURL: options.baseURL,
    plugins: [adminClient(getAdminPluginConfig())],
  });

  const enabled: Record<SocialProvider, boolean> = {
    github: options.enabledSocialProviders?.github ?? false,
    google: options.enabledSocialProviders?.google ?? false,
  };

  return {
    client,
    enabledSocialProviders: enabled,
    isSocialProviderEnabled(provider: SocialProvider) {
      return enabled[provider];
    },
  };
}

export type BetterSpaAuthClient = ReturnType<typeof createBetterSpaAuthClient>["client"];

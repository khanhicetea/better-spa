import { env } from "@/env/client";

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

import { createBetterSpaAuthClient } from "@better-spa/auth/client";
import { env } from "@/env/client";

const { client, enabledSocialProviders, isSocialProviderEnabled } = createBetterSpaAuthClient({
  enabledSocialProviders: {
    github: env.VITE_AUTH_GITHUB_ENABLED,
    google: env.VITE_AUTH_GOOGLE_ENABLED,
  },
});

export default client;
export { enabledSocialProviders, isSocialProviderEnabled };
export { SOCIAL_PROVIDER_LABELS, type SocialProvider } from "@better-spa/auth/client";

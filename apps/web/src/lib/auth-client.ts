import { createBetterSpaAuthClient } from "@better-spa/auth/client";
const { client } = createBetterSpaAuthClient();

export default client;
export { SOCIAL_PROVIDER_LABELS, type SocialProvider } from "@better-spa/auth/client";

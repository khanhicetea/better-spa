import { createKitKitAuthClient } from "@kitkit/auth/client";
const { client } = createKitKitAuthClient();

export default client;
export { SOCIAL_PROVIDER_LABELS, type SocialProvider } from "@kitkit/auth/client";

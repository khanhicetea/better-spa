import { expoClient, getCookie } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { apiUrl } from "./config";

export function getAuthCookie(): string {
  return getCookie(SecureStore.getItem("kitkit_cookie") ?? "{}");
}

export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [
    // @ts-expect-error Better Auth 1.7 RC.2 publishes incompatible Expo/core fetch generics.
    expoClient({
      scheme: "kitkit",
      storage: SecureStore,
      storagePrefix: "kitkit",
    }),
  ],
});

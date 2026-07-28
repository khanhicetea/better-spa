import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { apiUrl } from "./config";

export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [
    expoClient({
      scheme: "better-spa",
      storage: SecureStore,
      storagePrefix: "better-spa",
    }),
  ],
});

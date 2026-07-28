import Constants from "expo-constants";
import { Platform } from "react-native";

function developmentApiUrl() {
  if (Platform.OS === "web") return "http://localhost:3000";

  const metroHost = Constants.expoConfig?.hostUri?.split(":")[0];
  return metroHost ? `http://${metroHost}:3000` : "http://localhost:3000";
}

export const apiUrl = (process.env.EXPO_PUBLIC_API_URL?.trim() || developmentApiUrl()).replace(
  /\/$/,
  "",
);

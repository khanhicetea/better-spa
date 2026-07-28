import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { AppProviders } from "@/components/app-providers";

export default function RootLayout() {
  const isDark = useColorScheme() === "dark";

  return (
    <AppProviders>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </ThemeProvider>
    </AppProviders>
  );
}

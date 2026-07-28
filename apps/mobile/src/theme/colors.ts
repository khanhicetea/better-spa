import { useColorScheme } from "react-native";

const palettes = {
  light: {
    background: "#f6f7fb",
    surface: "#ffffff",
    surfaceMuted: "#eef1f7",
    text: "#17203a",
    textMuted: "#667085",
    border: "#dfe4ee",
    primary: "#3157d5",
    primaryPressed: "#2544ae",
    onPrimary: "#ffffff",
    danger: "#c9364f",
    success: "#18845b",
    input: "#ffffff",
  },
  dark: {
    background: "#0c1020",
    surface: "#151b2f",
    surfaceMuted: "#20283e",
    text: "#f5f7ff",
    textMuted: "#a8b0c5",
    border: "#2c3650",
    primary: "#7894ff",
    primaryPressed: "#617fe8",
    onPrimary: "#10162b",
    danger: "#ff7a91",
    success: "#55d5a0",
    input: "#11172a",
  },
} as const;

export function useAppColors() {
  return palettes[useColorScheme() === "dark" ? "dark" : "light"];
}

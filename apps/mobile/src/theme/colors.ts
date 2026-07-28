import { useThemeColor } from "heroui-native";

export function useAppColors() {
  const [
    background,
    surface,
    surfaceMuted,
    text,
    textMuted,
    border,
    primary,
    primaryPressed,
    onPrimary,
    danger,
    success,
    input,
  ] = useThemeColor([
    "background",
    "surface",
    "surface-secondary",
    "foreground",
    "muted",
    "border",
    "accent",
    "accent-hover",
    "accent-foreground",
    "danger",
    "success",
    "field",
  ]);

  return {
    background,
    surface,
    surfaceMuted,
    text,
    textMuted,
    border,
    primary,
    primaryPressed,
    onPrimary,
    danger,
    success,
    input,
  };
}

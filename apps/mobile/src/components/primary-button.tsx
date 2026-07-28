import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useAppColors } from "@/theme/colors";

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  pending = false,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  const colors = useAppColors();
  const isDisabled = disabled || pending;
  const backgroundColor =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.danger
        : colors.surfaceMuted;
  const foregroundColor =
    variant === "primary" ? colors.onPrimary : variant === "danger" ? "#ffffff" : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: isDisabled ? 0.55 : pressed ? 0.78 : 1 },
      ]}
    >
      {pending ? (
        <ActivityIndicator color={foregroundColor} />
      ) : (
        <Text style={[styles.label, { color: foregroundColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
});

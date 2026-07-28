import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAppColors } from "@/theme/colors";

export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  const colors = useAppColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  label: {
    fontSize: 15,
  },
});

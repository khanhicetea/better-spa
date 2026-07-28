import type { ComponentProps } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useAppColors } from "@/theme/colors";

type FormFieldProps = ComponentProps<typeof TextInput> & {
  label: string;
};

export function FormField({ label, style, ...props }: FormFieldProps) {
  const colors = useAppColors();

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        style={[
          styles.input,
          { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 16,
  },
});

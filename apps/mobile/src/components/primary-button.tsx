import { Button, Spinner, useThemeColor } from "heroui-native";

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
  const [accentForeground, dangerForeground, defaultForeground] = useThemeColor([
    "accent-foreground",
    "danger-foreground",
    "default-foreground",
  ]);
  const foregroundColor =
    variant === "primary"
      ? accentForeground
      : variant === "danger"
        ? dangerForeground
        : defaultForeground;

  return (
    <Button
      className="min-h-12 w-full rounded-2xl"
      isDisabled={disabled || pending}
      onPress={onPress}
      size="lg"
      variant={variant}
    >
      {pending ? (
        <Spinner color={foregroundColor} size="sm" />
      ) : (
        <Button.Label>{label}</Button.Label>
      )}
    </Button>
  );
}

import { Input, Label, TextField } from "heroui-native";
import type { ComponentProps } from "react";

type FormFieldProps = ComponentProps<typeof Input> & {
  label: string;
};

export function FormField({ label, className, ...props }: FormFieldProps) {
  return (
    <TextField>
      <Label>{label}</Label>
      <Input
        autoCapitalize="none"
        className={`min-h-12 rounded-2xl ${className ?? ""}`}
        {...props}
      />
    </TextField>
  );
}

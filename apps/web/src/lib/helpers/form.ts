import { ORPCError } from "@orpc/client";
import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";

export const handleFormError = <TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
) => {
  if (error instanceof ORPCError && error.code === "INPUT_VALIDATION_FAILED") {
    setError("root" as FieldPath<TFieldValues>, {
      type: "server",
      message: error.message,
    });
    Object.entries(error.data.fieldErrors).forEach(([field, errors]) => {
      setError(field as FieldPath<TFieldValues>, {
        type: "server",
        message: (errors as string[]).join(", "),
      });
    });
  }
};

export const handleToastError = <_TFieldValues extends FieldValues>(error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    toast.error((error as { message: string }).message);
  }
};

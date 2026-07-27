import { useSuspenseQuery } from "@tanstack/react-query";
import { bootstrapQueryOptions } from "../queries";

export function useSessionUser() {
  const { data } = useSuspenseQuery(bootstrapQueryOptions());
  return { user: data.user, isLoading: false };
}

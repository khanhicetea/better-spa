import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

export function invalidateAdminUsers(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: orpc.user.list.key({ type: "query" }),
  });
}

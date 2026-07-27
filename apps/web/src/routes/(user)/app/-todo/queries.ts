import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

export function invalidateTodos(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: orpc.todo.list.key({ type: "query" }),
  });
}

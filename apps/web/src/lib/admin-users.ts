import type { Outputs } from "@kitkit/rpc/types";
import type { QueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

export type AdminUser = Outputs["user"]["list"]["users"][number];

export function invalidateAdminUsers(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    queryKey: orpc.user.list.key({ type: "query" }),
  });
}

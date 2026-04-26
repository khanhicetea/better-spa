import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { rpcClient } from "@/lib/orpc";
import type { Outputs } from "@/rpc/types";

export const QUERY_KEYS = {
  shell: ["shell"] as const,
  auth: ["user"] as const,
} as const;

export const authQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.auth,
    queryFn: async ({ signal }) => {
      const user = await rpcClient.auth.getCurrentUser(
        {},
        {
          signal,
        },
      );
      return user;
    },
    staleTime: Infinity,
    retry: 1,
    refetchOnWindowFocus: true,
  });

export const shellQueryOptions = () =>
  queryOptions({
    queryKey: QUERY_KEYS.shell,
    queryFn: async ({ signal }) => {
      const shellData = await rpcClient.app.shellData(
        {},
        {
          signal,
        },
      );
      return shellData;
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

export async function invalidateAuthAndShellQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.auth,
      refetchType: "all",
    }),
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.shell,
      refetchType: "all",
    }),
  ]);
}

export type AuthQueryResult = Outputs["auth"]["getCurrentUser"];

import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { rpcClient } from "@/lib/orpc";

const BOOTSTRAP_QUERY_KEY = ["app", "bootstrap"] as const;

export const bootstrapQueryOptions = () =>
  queryOptions({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: ({ signal }) => rpcClient.app.bootstrap({}, { signal }),
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });

export async function invalidateBootstrap(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: BOOTSTRAP_QUERY_KEY,
    refetchType: "all",
  });
}

import type { QueryClient } from "@tanstack/react-query";
import { authQueryOptions, shellQueryOptions } from "@/lib/queries";

export async function preloadBetterSpa(queryClient: QueryClient) {
  await queryClient.ensureQueryData(shellQueryOptions());

  queryClient.prefetchQuery(authQueryOptions()).catch(() => {
    // Anonymous routes can opt into shell+SPA without blocking the shell render.
  });
}

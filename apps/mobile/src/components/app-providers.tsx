import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { AppState, Platform } from "react-native";
import { apiHealthUrl, getApiHealth } from "@/lib/api-health";
import { errorMessage } from "@/lib/errors";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    const controller = new AbortController();
    const startedAt = Date.now();
    let mounted = true;
    const timeout = setTimeout(() => controller.abort(), 5_000);

    async function logApiHealth() {
      try {
        const health = await getApiHealth(controller.signal);
        if (!mounted) return;
        console.info("[API health] connected", {
          url: apiHealthUrl,
          latencyMs: Date.now() - startedAt,
          runtime: health.runtime,
          requestId: health.requestId,
        });
      } catch (error) {
        if (!mounted) return;
        console.error("[API health] unavailable", {
          url: apiHealthUrl,
          latencyMs: Date.now() - startedAt,
          error: controller.signal.aborted
            ? "Health request timed out after 5 seconds."
            : errorMessage(error, "Unable to connect to the API."),
        });
      } finally {
        clearTimeout(timeout);
      }
    }

    void logApiHealth();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = AppState.addEventListener("change", (status) => {
      focusManager.setFocused(status === "active");
    });
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/// <reference types="vite/client" />

import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type React from "react";
import { ThemeProvider } from "@/components/spa/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useShellData } from "@/lib/hooks/app";
import type { RPCClient } from "@/lib/orpc";
import {
  type AuthQueryResult,
  authQueryOptions,
  shellQueryOptions,
} from "@/lib/queries";
import appCss from "@/styles.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  user: AuthQueryResult;
  rpcClient: RPCClient;
}>()({
  beforeLoad: async ({ context }) => {
    // Shell Pattern: SSR shell data via RPC with React Query caching
    // This runs on the server and provides minimal data needed for the app shell
    await context.queryClient.ensureQueryData(shellQueryOptions());

    // Prefetch user data but don't await it - let client handle it
    // This respects authQueryOptions options (staleTime, error handling, etc.)
    context.queryClient.prefetchQuery(authQueryOptions()).catch(() => {
      // User data not available (not logged in) - that's fine
    });
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Shell SPA",
      },
      {
        name: "description",
        content:
          "A minimal shell SPA boilerplate with SSR shell and client-side SPA",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  ssr: true,
  shellComponent: RootShell,
  component: RootComponent,
});

function RootComponent() {
  return (
    <ThemeProvider>
      <Outlet />

      <Toaster richColors />

      <TanStackDevtools
        plugins={[
          {
            name: "TanStack Query",
            render: <ReactQueryDevtoolsPanel />,
          },
          {
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </ThemeProvider>
  );
}

function RootShell({ children }: { readonly children: React.ReactNode }) {
  const shell = useShellData();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`ver_${shell.app.version} ${shell.app.theme}`}
    >
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

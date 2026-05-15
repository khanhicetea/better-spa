/// <reference types="vite/client" />

import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type React from "react";
import { ThemeProvider } from "@/components/spa/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { DefaultCatchBoundary } from "@/components/spa/default-catch-boundary";
import type { RPCClient } from "@/lib/orpc";
import appCss from "@/styles.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  user: null;
  rpcClient: RPCClient;
}>()({
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
        title: "Better SPA",
      },
      {
        name: "description",
        content: "A minimal shell SPA boilerplate with SSR shell and client-side SPA",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  ssr: true,
  errorComponent: DefaultCatchBoundary,
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
  return (
    <html lang="en" suppressHydrationWarning>
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

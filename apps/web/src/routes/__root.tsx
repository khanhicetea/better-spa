/// <reference types="vite/client" />

import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { createMiddleware } from "@tanstack/react-start";
import { evlogErrorHandler } from "evlog/nitro/v3";
import type React from "react";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { DefaultCatchBoundary } from "@/components/shell/default-catch-boundary";
import type { RPCClient } from "@/lib/orpc";
import { bootstrapQueryOptions } from "@/lib/queries";
import appCss from "@/styles.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  rpcClient: RPCClient;
}>()({
  server: {
    middleware: [createMiddleware().server(evlogErrorHandler)],
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(bootstrapQueryOptions()),
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
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  ssr: true,
  errorComponent: DefaultCatchBoundary,
  shellComponent: RootShell,
  component: RootComponent,
});

function RootComponent() {
  const bootstrap = Route.useLoaderData();
  return (
    <ThemeProvider defaultTheme={bootstrap.preferences.theme}>
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

import { createFileRoute } from "@tanstack/react-router";
import { getRequestContext } from "@better-spa/rpc/context";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const { auth } = getRequestContext();
        return auth.handler(request);
      },
      POST: ({ request }) => {
        const { auth } = getRequestContext();
        return auth.handler(request);
      },
    },
  },
});

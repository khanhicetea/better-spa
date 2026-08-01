import { createFileRoute } from "@tanstack/react-router";
import { getRequestContext } from "@kitkit/rpc/context";

export const Route = createFileRoute("/api/health/live")({
  server: {
    handlers: {
      GET: () => {
        const context = getRequestContext();
        return Response.json({
          status: "ok",
          runtime: context.runtime,
          requestId: context.requestId,
        });
      },
    },
  },
});

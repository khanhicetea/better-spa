import { createFileRoute } from "@tanstack/react-router";
import { checkDatabaseReady } from "@kitkit/db/client";
import { logger } from "@kitkit/observability";
import { getRequestContext } from "@kitkit/rpc/context";

export const Route = createFileRoute("/api/health/ready")({
  server: {
    handlers: {
      GET: async () => {
        const context = getRequestContext();
        try {
          await checkDatabaseReady(context.db);
          return Response.json({
            status: "ready",
            runtime: context.runtime,
            requestId: context.requestId,
          });
        } catch (error) {
          logger.warn("Database readiness check failed", { error });
          return Response.json(
            {
              status: "unavailable",
              runtime: context.runtime,
              requestId: context.requestId,
            },
            { status: 503 },
          );
        }
      },
    },
  },
});

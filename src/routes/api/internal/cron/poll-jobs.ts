import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env/server";
import { runJobPollingTask } from "@/server/worker/polling-task";
import { logger } from "@/server/logger";

function isAuthorized(request: Request) {
  const configuredSecret = process.env.CRON_SECRET ?? env.CRON_SECRET;

  if (!configuredSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  return bearerToken === configuredSecret || headerSecret === configuredSecret;
}

export const Route = createFileRoute("/api/internal/cron/poll-jobs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthorized(request)) {
          logger.warn("Rejected unauthorized cron poll-jobs request", {
            userAgent: request.headers.get("user-agent"),
          });

          return Response.json(
            { ok: false, error: "Unauthorized" },
            { status: 401 },
          );
        }

        const result = await runJobPollingTask();

        return Response.json({
          ok: true,
          ...result,
        });
      },
    },
  },
});

import { ORPCError, onError, ValidationError } from "@orpc/server";
import { CompressionPlugin, RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin } from "@orpc/server/plugins";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";
import { tryAuthMiddleware } from "@/lib/middlewares";
import { rpcRouter } from "@/rpc/router";
import { logger } from "@/server/logger";

const plugins = [
  process.env.RPC_COMPRESSION !== undefined
    ? new CompressionPlugin()
    : undefined,
  new BatchHandlerPlugin(),
];

const handler = new RPCHandler(rpcRouter, {
  plugins: plugins.filter((x) => x !== undefined),
  interceptors: [
    onError((error) => {
      logger.error("Unhandled RPC server error", { error });
    }),
  ],
  clientInterceptors: [
    onError((error) => {
      if (
        error instanceof ORPCError &&
        error.code === "BAD_REQUEST" &&
        error.cause instanceof ValidationError
      ) {
        // If you only use Zod you can safely cast to ZodIssue[]
        const zodError = new z.ZodError(
          error.cause.issues as z.core.$ZodIssue[],
        );

        throw new ORPCError("INPUT_VALIDATION_FAILED", {
          status: 422,
          message: z.prettifyError(zodError),
          data: z.flattenError(zodError),
          cause: error.cause,
        });
      }

      if (
        error instanceof ORPCError &&
        error.code === "INTERNAL_SERVER_ERROR" &&
        error.cause instanceof ValidationError
      ) {
        throw new ORPCError("OUTPUT_VALIDATION_FAILED", {
          cause: error.cause,
        });
      }
    }),
  ],
});

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    middleware: [tryAuthMiddleware],
    handlers: {
      ANY: async ({ request, context }) => {
        const { response } = await handler.handle(request, {
          prefix: "/api/rpc",
          context: {
            headers: request.headers,
            session: context.session,
            db: context.db,
            auth: context.auth,
            repos: context.repos,
            waitUntil: context.waitUntil,
          },
        });

        return response ?? new Response("Not Found", { status: 404 });
      },
    },
  },
});

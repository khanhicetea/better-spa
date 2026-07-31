import { ORPCError, onError, ValidationError } from "@orpc/server";
import { CompressionPlugin, RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin, ResponseHeadersPlugin } from "@orpc/server/plugins";
import { createFileRoute } from "@tanstack/react-router";
import { withEvlog } from "evlog/orpc";
import * as z from "zod";
import { getRequestContext } from "@better-spa/rpc/context";
import { rpcRouter } from "@better-spa/rpc/router";
import { evlogRedactConfig } from "@better-spa/observability";

const plugins = [
  process.env.RPC_COMPRESSION !== undefined ? new CompressionPlugin() : undefined,
  new BatchHandlerPlugin(),
  new ResponseHeadersPlugin(),
];

const handler = withEvlog(
  new RPCHandler(rpcRouter, {
    plugins: plugins.filter((x) => x !== undefined),
    clientInterceptors: [
      onError((error) => {
        if (
          error instanceof ORPCError &&
          error.code === "BAD_REQUEST" &&
          error.cause instanceof ValidationError
        ) {
          // If you only use Zod you can safely cast to ZodIssue[]
          const zodError = new z.ZodError(error.cause.issues as z.core.$ZodIssue[]);

          throw new ORPCError("VALIDATION_FAILED", {
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
  }),
  {
    include: ["/api/rpc", "/api/rpc/**"],
    routes: {
      "/api/rpc": { service: "better-spa-rpc" },
      "/api/rpc/**": { service: "better-spa-rpc" },
    },
    redact: evlogRedactConfig,
    enrich: (event) => {
      const context = getRequestContext();
      event.event.requestId = context.requestId;
      event.event.runtime = context.runtime;
    },
    waitUntil: (promise) => getRequestContext().waitUntil(promise),
  },
);

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { response } = await handler.handle(request, {
          prefix: "/api/rpc",
          context: getRequestContext(),
        });

        return response ?? new Response("Not Found", { status: 404 });
      },
    },
  },
});

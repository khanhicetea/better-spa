import "@tanstack/react-start/server-only";
import { createRouterClient } from "@orpc/server";
import { rpcRouter } from "@better-spa/rpc/router";
import { getRequestContext } from "@better-spa/rpc/context";
import type { RPCClient } from "./orpc";

export function makeServerRPCClient(): RPCClient {
  return createRouterClient(rpcRouter, {
    context: async () => getRequestContext(),
  });
}

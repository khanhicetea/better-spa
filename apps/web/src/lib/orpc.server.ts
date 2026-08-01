import "@tanstack/react-start/server-only";
import { createRouterClient } from "@orpc/server";
import { rpcRouter } from "@kitkit/rpc/router";
import { getRequestContext } from "@kitkit/rpc/context";
import type { RPCClient } from "./orpc";

export function makeServerRPCClient(): RPCClient {
  return createRouterClient(rpcRouter, {
    context: async () => getRequestContext(),
  });
}

import "@tanstack/react-start/server-only";
import { createRouterClient } from "@orpc/server";
import { rpcRouter } from "@/server/rpc/router";
import {
  getCurrentAuth,
  getCurrentDB,
  getCurrentRepos,
  getCurrentSession,
  getRequestHeaders,
  getWaitUntil,
} from "@/server/context";
import type { RPCClient } from "./orpc";

export function makeServerRPCClient(): RPCClient {
  return createRouterClient(rpcRouter, {
    context: async () => {
      // Create oRPC context for server client; runs on server per handler call.
      return {
        headers: getRequestHeaders(),
        db: getCurrentDB(),
        session: getCurrentSession(),
        auth: getCurrentAuth(),
        repos: getCurrentRepos(),
        waitUntil: getWaitUntil(),
      };
    },
  });
}

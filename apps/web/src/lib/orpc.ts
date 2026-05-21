import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import type { RouterClient } from "@orpc/server";
import { createIsomorphicFn } from "@tanstack/react-start";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { rpcRouter } from "@better-spa/rpc/router";
import { makeServerRPCClient } from "./orpc.server";

export type RPCClient = RouterClient<typeof rpcRouter>;

const getORPCClient = createIsomorphicFn()
  .server((): RPCClient => {
    // Server imports (pg, kysely, AsyncLocalStorage, etc.) live exclusively in
    // orpc.server.ts which carries `@tanstack/react-start/server-only`. The
    // Start compiler prunes this entire branch—and anything it imports—from the
    // client bundle.
    return makeServerRPCClient();
  })
  .client((): RPCClient => {
    const link = new RPCLink({
      url: `${window.location.origin}/api/rpc`,
      plugins: [
        new BatchLinkPlugin({
          mode: "buffered",
          groups: [
            {
              condition: (_options) => true,
              context: {},
            },
          ],
        }),
      ],
    });

    return createORPCClient(link);
  });

export const rpcClient: RPCClient = getORPCClient();
export const orpc = createTanstackQueryUtils(rpcClient);

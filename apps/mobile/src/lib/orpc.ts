import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { rpcRouter } from "@kitkit/rpc/router";
import { getAuthCookie } from "./auth-client";
import { apiUrl } from "./config";

type RPCClient = RouterClient<typeof rpcRouter>;

const link = new RPCLink({
  url: `${apiUrl}/api/rpc`,
  headers: () => {
    const cookie = getAuthCookie();
    return cookie ? { Cookie: cookie } : {};
  },
  fetch: (request, init) =>
    fetch(request, {
      ...init,
      credentials: "omit",
    }),
});

const rpcClient: RPCClient = createORPCClient(link);
export const orpc = createTanstackQueryUtils(rpcClient);

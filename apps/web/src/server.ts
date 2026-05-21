import handler from "@tanstack/react-start/server-entry";

// For Nodejs runtime
import { createNodeHandler } from "./server/node-server";

// For Cloudflare Worker runtime
// import { createCloudflareHandler } from "./server/cloudflare-worker";

export default {
  // fetch: createCloudflareHandler(handler).fetch,
  fetch: createNodeHandler(handler).fetch,
};

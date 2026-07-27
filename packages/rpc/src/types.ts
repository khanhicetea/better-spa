import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import type { rpcRouter } from "./router";

export type Inputs = InferRouterInputs<typeof rpcRouter>;
export type Outputs = InferRouterOutputs<typeof rpcRouter>;

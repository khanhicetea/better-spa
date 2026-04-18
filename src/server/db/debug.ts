import type {
  KyselyPlugin,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryResult,
  RootOperationNode,
} from "kysely";
import { logger } from "@/server/logger";

/**
 * A Kysely plugin that logs the execution time of queries.
 *
 * Note: Kysely plugins operate on the AST (Abstract Syntax Tree) before compilation,
 * so they don't have direct access to the final SQL string.
 * For full SQL logging with timing, consider using Kysely's built-in `log` configuration.
 */
export class QueryLoggingPlugin implements KyselyPlugin {
  private queryInfo = new WeakMap<
    object,
    { startTime: number; kind: string }
  >();

  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    this.queryInfo.set(args.queryId, {
      startTime: Date.now(),
      kind: args.node.kind,
    });
    return args.node;
  }

  async transformResult(
    args: PluginTransformResultArgs,
  ): Promise<QueryResult<any>> {
    const info = this.queryInfo.get(args.queryId);

    if (info) {
      if (process.env.KYSELY_QUERY_DEBUG !== "true") {
        return args.result;
      }

      const duration = Date.now() - info.startTime;
      logger.debug("Kysely query completed", {
        operation: info.kind,
        durationMs: duration,
      });
    }

    return args.result;
  }
}

/**
 * Helper to create a new instance of the QueryLoggingPlugin.
 */
export const createQueryLoggingPlugin = () => new QueryLoggingPlugin();

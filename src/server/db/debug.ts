import type {
  KyselyPlugin,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryResult,
  RootOperationNode,
} from "kysely";

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
      const duration = Date.now() - info.startTime;
      console.log(`[Kysely] ${info.kind} query took ${duration}ms`);
    }

    return args.result;
  }
}

/**
 * Helper to create a new instance of the QueryLoggingPlugin.
 */
export const createQueryLoggingPlugin = () => new QueryLoggingPlugin();

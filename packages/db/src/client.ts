import type {
  KyselyPlugin,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryResult,
  RootOperationNode,
} from "kysely";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { logger } from "@better-spa/shared/logger";
import type { Database } from "./schema";

const { Pool } = pg;

export class QueryLoggingPlugin implements KyselyPlugin {
  private queryInfo = new WeakMap<object, { startTime: number; kind: string }>();

  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    this.queryInfo.set(args.queryId, {
      startTime: Date.now(),
      kind: args.node.kind,
    });
    return args.node;
  }

  async transformResult(args: PluginTransformResultArgs): Promise<QueryResult<any>> {
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

export const createQueryLoggingPlugin = () => new QueryLoggingPlugin();

declare global {
  // eslint-disable-next-line no-var
  var __db: Kysely<Database> | undefined;
}

const MAX_CONNECTIONS = parseInt(process.env.DATABASE_MAX_CONNECTIONS || "2", 10);

export const getDatabasePooling = (connectionString: string) => {
  const pool = new Pool({
    connectionString,
    max: MAX_CONNECTIONS,
  });

  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
    plugins: [
      new CamelCasePlugin({
        maintainNestedObjectKeys: true,
      }),
      createQueryLoggingPlugin(),
    ],
  });
};

export const getDatabase = (connectionString: string) => {
  if (globalThis.__db) {
    return globalThis.__db;
  }

  const db = getDatabasePooling(connectionString);
  globalThis.__db = db;

  return db;
};

export type DB = ReturnType<typeof getDatabase>;

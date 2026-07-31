import { AsyncLocalStorage } from "node:async_hooks";
import type { RedactConfig } from "evlog";

export type RuntimeName = "node" | "cloudflare";

export type LogContext = {
  requestId: string;
  runtime: RuntimeName;
  path?: string;
  procedure?: string;
};

type LogLevel = "debug" | "info" | "warn" | "error";
type LogMeta = Record<string, unknown>;

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY =
  /authorization|cookie|password|secret|token|database.?url|connection.?string|access.?key|client.?secret|oauth|s3.?credential/i;
const logStorage = new AsyncLocalStorage<LogContext>();

export const evlogRedactConfig = {
  paths: [
    "**.authorization",
    "**.cookie",
    "**.password",
    "**.secret",
    "**.token",
    "**.*Token",
    "**.databaseUrl",
    "**.connectionString",
    "**.accessKey",
    "**.accessKeyId",
    "**.secretAccessKey",
    "**.clientSecret",
    "**.apiKey",
    "**.apiSecret",
    "**.credential",
    "**.credentials",
    "**.oauth",
    "**.s3Credentials",
  ],
} satisfies RedactConfig;

function redactString(value: string): string {
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, `$1${REDACTED}`)
    .replace(/(X-Amz-(?:Credential|Signature|Security-Token)=)[^&\s]+/gi, `$1${REDACTED}`);
}

function serializeError(error: Error, seen: WeakSet<object>): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    name: error.name,
    message: redactString(error.message),
    stack: error.stack ? redactString(error.stack) : undefined,
  };

  if (error.cause !== undefined) {
    serialized.cause = sanitize(error.cause, seen);
  }

  return serialized;
}

function sanitize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) return serializeError(value, seen);
  if (value instanceof Headers) return sanitize(Object.fromEntries(value), seen);
  if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));
  if (typeof value === "string") return redactString(value);
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";

  seen.add(value);
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY.test(key) ? REDACTED : sanitize(item, seen);
  }
  return result;
}

function resolveLevel(): LogLevel {
  const value = process.env.LOG_LEVEL?.toLowerCase();
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const priorities: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function write(level: LogLevel, message: string, meta: LogMeta = {}) {
  if (priorities[level] < priorities[resolveLevel()]) return;
  const safeMeta = sanitize(meta);

  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...logStorage.getStore(),
    ...(typeof safeMeta === "object" && safeMeta ? safeMeta : {}),
  });

  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else if (level === "debug") console.debug(record);
  else console.info(record);
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => write("debug", message, meta),
  info: (message: string, meta?: LogMeta) => write("info", message, meta),
  warn: (message: string, meta?: LogMeta) => write("warn", message, meta),
  error: (message: string, meta?: LogMeta) => write("error", message, meta),
};

export function runWithLogContext<T>(context: LogContext, callback: () => T): T {
  return logStorage.run(context, callback);
}

export function updateLogContext(values: Partial<LogContext>): void {
  const context = logStorage.getStore();
  if (context) Object.assign(context, values);
}

export function getLogContext(): LogContext | undefined {
  return logStorage.getStore();
}

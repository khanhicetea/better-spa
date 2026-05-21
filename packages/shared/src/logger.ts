type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLogLevel(): LogLevel {
  const fromEnv = process.env.LOG_LEVEL?.toLowerCase();
  if (fromEnv === "debug" || fromEnv === "info" || fromEnv === "warn" || fromEnv === "error") {
    return fromEnv;
  }

  if (process.env.SERVER_DEBUG === "true") {
    return "debug";
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const activeLogLevel = resolveLogLevel();

function shouldLog(level: LogLevel) {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[activeLogLevel];
}

function formatMeta(meta?: unknown) {
  if (meta === undefined) return "";
  return ` ${JSON.stringify(meta)}`;
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (!shouldLog("debug")) return;
    console.debug(`[debug] ${message}${formatMeta(meta)}`);
  },
  info(message: string, meta?: unknown) {
    if (!shouldLog("info")) return;
    console.info(`[info] ${message}${formatMeta(meta)}`);
  },
  warn(message: string, meta?: unknown) {
    if (!shouldLog("warn")) return;
    console.warn(`[warn] ${message}${formatMeta(meta)}`);
  },
  error(message: string, meta?: unknown) {
    if (!shouldLog("error")) return;
    console.error(`[error] ${message}${formatMeta(meta)}`);
  },
};

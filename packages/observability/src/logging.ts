import pino, { type Logger, type LoggerOptions } from "pino";

import { createRuntimeConfig } from "@kalshi-quant-dashboard/config";

export function createLogger(options: LoggerOptions = {}): Logger {
  const config = createRuntimeConfig();

  return pino({
    level: config.env.LOG_LEVEL,
    base: {
      service: config.env.OTEL_SERVICE_NAME
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...options
  });
}

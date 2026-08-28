import pino from 'pino';

/**
 * Structured logger instance using pino.
 * In production, outputs JSON lines for log aggregation.
 * In development, uses pretty-printing for readability.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: process.env.NODE_ENV === 'production'
    ? undefined // JSON output to stdout for log aggregation
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: false,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
});

export type Logger = typeof logger;

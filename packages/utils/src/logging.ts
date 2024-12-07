import debug, { Debugger } from 'debug';

import { isObjectLike } from './type-guards/is-object-like';

function createLoggerContext() {
  return {
    delimiter: ':',
    plain: '%s',
    withObjectData: (process.env.DEBUG_FORMAT ?? 'json') === 'object' ? '%s %O' : '%s %j',
    withPlainData: '%s %s',
  } as const;
}

type LoggerContext = ReturnType<typeof createLoggerContext>;

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

type LogFn = (message: string, data?: LogData) => void;

type LogData = unknown;

interface LogEntry extends Record<string, unknown> {
  message: string;
  data?: LogData;
}

export interface Logger {
  /**
   * Log level only for debugging purposes. Most verbose debug level.
   */
  debug: LogFn;
  /**
   * Default log level during production. Highlights events that are crucial for
   * business purposes.
   */
  info: LogFn;
  /**
   * Less serious error condition that should be investigated.
   */
  warning: LogFn;
  /**
   * Situations which prevents application from performing expected operations.
   * Should be investigated immediately.
   */
  error: LogFn;
  extend: (namespace: string) => Logger;
  namespace: string;
}

function logEntry(log: Debugger, entry: LogEntry, ctx: LoggerContext) {
  if (entry.data === undefined) {
    log(ctx.plain, entry.message);
  } else {
    if (isObjectLike(entry.data)) {
      log(ctx.withObjectData, entry.message, entry.data);
    } else {
      log(ctx.withPlainData, entry.message, entry.data);
    }
  }
}

function extendNamespace(mainNamespace: string, namespace: string, ctx: LoggerContext) {
  return mainNamespace + ctx.delimiter + namespace;
}

function jsonFormatterReplacer(_key: string, value: unknown) {
  // All Error properties (including non-enumerable)
  if (value instanceof Error) {
    const error: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(value)) {
      // @ts-expect-error Error object can be index accessed
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const val = value[key];
      if (key === 'stack') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        error[key] = val?.toString().split('\n');
      } else {
        error[key] = val;
      }
    }
    return error;
  }

  return value;
}

debug.formatters.j = (value) => {
  return JSON.stringify(value, jsonFormatterReplacer, 2);
};

export function createLogger(namespace: string): Logger {
  return _prepLoggerWithNamespace(namespace, {
    byNamespace: {},
    ctx: createLoggerContext(),
  });
}

interface PrepLoggerWithNamespaceContext {
  /**
   * Existing logger by namespace memo
   */
  byNamespace: Record<string, Debugger>;
  ctx: LoggerContext;
}

function _prepLoggerWithNamespace(
  mainNamespace: string,
  ctx: PrepLoggerWithNamespaceContext
): Logger {
  function logEntryLogger(subNamespace: string): LogFn {
    const logNamespace = extendNamespace(mainNamespace, subNamespace, ctx.ctx);
    let log = ctx.byNamespace[logNamespace];
    return (message, data) => {
      if (!log) {
        log = debug(logNamespace);
        ctx.byNamespace[logNamespace] = log;
      }
      logEntry(
        log,
        {
          message,
          data,
        },
        ctx.ctx
      );
    };
  }

  return {
    debug: logEntryLogger(LogLevel.DEBUG),
    info: logEntryLogger(LogLevel.INFO),
    warning: logEntryLogger(LogLevel.WARNING),
    error: logEntryLogger(LogLevel.ERROR),
    extend: (namespace) =>
      _prepLoggerWithNamespace(extendNamespace(mainNamespace, namespace, ctx.ctx), ctx),
    namespace: mainNamespace,
  };
}

import debug, { Debugger } from 'debug';

import { memoize1Plain } from './memoize1';
import { isObjectLike } from './type-guards/is-object-like';
import { isPlainObject } from './type-guards/is-plain-object';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

const rootLog = debug(`logging:${LogLevel.INFO}`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getProcess(): any {
  if (typeof process !== 'undefined') {
    return process;
  }

  // In browser
  return {
    env: {
      DEBUG_FORMAT: 'object',
    },
  };
}

function createLoggerContext() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const debugFormat = getProcess()?.env?.DEBUG_FORMAT ?? 'json';

  const result = {
    delimiter: ':',
    plain: '%s',
    withObjectData: debugFormat === 'object' ? '%s %O' : '%s %j',
    withPlainData: '%s %s',
  } as const;

  rootLog(result.withObjectData, 'createLoggerContext', result);

  return result;
}

type LoggerContext = ReturnType<typeof createLoggerContext>;

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
      } else if (isPlainObject(val) || typeof val !== 'object') {
        error[key] = val;
      }
    }
    return error;
  } else if (typeof value === 'bigint') {
    return value.toString();
  }

  return value;
}

debug.formatters.j = (value) => {
  return JSON.stringify(value, jsonFormatterReplacer);
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

const CONSOLE = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function _prepLoggerWithNamespace(
  mainNamespace: string,
  ctx: PrepLoggerWithNamespaceContext
): Logger {
  function lazyCreate(
    subNamespace: string,
    options?: {
      log?: Debugger['log'];
    }
  ): LogFn {
    const logNamespace = extendNamespace(mainNamespace, subNamespace, ctx.ctx);
    let log = ctx.byNamespace[logNamespace];
    return (message, data) => {
      if (!log) {
        log = debug(logNamespace);
        if (options?.log) {
          log.log = options.log;
        }
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
    debug: lazyCreate(LogLevel.DEBUG, {
      log: CONSOLE.debug,
    }),
    info: lazyCreate(LogLevel.INFO, {
      log: CONSOLE.info,
    }),
    warning: lazyCreate(LogLevel.WARNING, {
      log: CONSOLE.warn,
    }),
    error: lazyCreate(LogLevel.ERROR, {
      log: CONSOLE.error,
    }),
    extend: memoize1Plain((namespace) =>
      _prepLoggerWithNamespace(extendNamespace(mainNamespace, namespace, ctx.ctx), ctx)
    ),
    namespace: mainNamespace,
  };
}

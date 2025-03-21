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

function isBrowser() {
  // @ts-expect-error Might not be browser
  return typeof window !== 'undefined';
}

const CONSOLE = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function createLoggerContext(options?: {
  console?: Readonly<typeof CONSOLE>;
  format?: 'object' | 'json';
}) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const debugFormat = options?.format ?? getProcess()?.env?.DEBUG_FORMAT ?? 'json';

  const plain = '%s';
  const objectData = debugFormat === 'object' ? '%O' : '%j';

  const result = {
    delimiter: ':',
    plain,
    objectData,
    plainObjectData: `${plain} ${objectData}`,
    plainPlain: `${plain} ${plain}`,
    console: options?.console ?? CONSOLE,
  } as const;

  rootLog(result.plainObjectData, 'createLoggerContext', result);

  return result;
}

type LoggerContext = ReturnType<typeof createLoggerContext>;

type LogFn = (message: unknown, data?: LogData) => void;

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
    if (entry.message !== '') {
      log(ctx.plain, entry.message);
    }
  } else {
    if (isObjectLike(entry.data)) {
      if (entry.message === '') {
        log(ctx.objectData, entry.data);
      } else {
        log(ctx.plainObjectData, entry.message, entry.data);
      }
    } else {
      if (entry.message === '') {
        log(ctx.plain, entry.data);
      } else {
        log(ctx.plainPlain, entry.message, entry.data);
      }
    }
  }
}

function extendNamespace(mainNamespace: string, namespace: string, ctx: LoggerContext) {
  return mainNamespace + ctx.delimiter + namespace;
}

/**
 * Extracts stack from error as a plain string for serializable logging
 */
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

if (!isBrowser()) {
  // Serialize errors only in node
  debug.formatters.j = (value) => {
    return JSON.stringify(value, jsonFormatterReplacer);
  };
}

export function createLogger(
  namespace: string,
  options?: Pick<
    NonNullable<Parameters<typeof createLoggerContext>[0]>,
    'console' | 'format'
  >
): Logger {
  return _prepLoggerWithNamespace(namespace, {
    byNamespace: {},
    loggerContext: createLoggerContext(options),
  });
}

interface PrepLoggerWithNamespaceContext {
  /**
   * Existing logger by namespace memo
   */
  byNamespace: Record<string, Debugger>;
  loggerContext: LoggerContext;
}

function findKeyForError(value: object) {
  const name = 'error';
  const prefix = '_';

  let count = 0;
  let currentKey = name;
  const overflowBreak = 100;
  while (currentKey in value) {
    if (count >= overflowBreak) {
      throw new Error('Failed to find unused property key to set error object');
    }
    currentKey = prefix.repeat(++count) + name;
  }

  return currentKey;
}

function extractMessageAndData(message: unknown, data?: LogData) {
  if (typeof message === 'string') {
    return { message, data };
  } else if (message instanceof Error) {
    if (isObjectLike(data)) {
      const errorKey = findKeyForError(data);
      return {
        message: message.message,
        data: {
          ...data,
          [errorKey]: message,
        },
      };
    } else if (data !== undefined) {
      return {
        message: message.message,
        data: {
          data,
          error: message,
        },
      };
    } else {
      return {
        message: message.message,
        data: message,
      };
    }
  } else if (typeof message === 'object') {
    return {
      message: '',
      data: {
        message,
        data,
      },
    };
  } else {
    return {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      message: String(message),
      data,
    };
  }
}

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
    const logNamespace = extendNamespace(mainNamespace, subNamespace, ctx.loggerContext);
    let log = ctx.byNamespace[logNamespace];
    return (message, data) => {
      if (!log) {
        log = debug(logNamespace);
        if (options?.log) {
          log.log = options.log;
        }
        ctx.byNamespace[logNamespace] = log;
      }
      logEntry(log, extractMessageAndData(message, data), ctx.loggerContext);
    };
  }

  return {
    debug: lazyCreate(LogLevel.DEBUG, {
      log: ctx.loggerContext.console.debug,
    }),
    info: lazyCreate(LogLevel.INFO, {
      log: ctx.loggerContext.console.info,
    }),
    warning: lazyCreate(LogLevel.WARNING, {
      log: ctx.loggerContext.console.warn,
    }),
    error: lazyCreate(LogLevel.ERROR, {
      log: ctx.loggerContext.console.error,
    }),
    extend: memoize1Plain((namespace) =>
      _prepLoggerWithNamespace(
        extendNamespace(mainNamespace, namespace, ctx.loggerContext),
        ctx
      )
    ),
    namespace: mainNamespace,
  };
}

import debug, { Debugger } from 'debug';

type LogLevel = 'info' | 'warning' | 'error';

type LogData = Record<string, unknown>;

interface LogEntry extends Record<string, unknown> {
  level: LogLevel;
  message: string;
  data?: LogData;
}

export interface Logger {
  log: (entry: LogEntry) => void;
  info: (message: string, data?: LogData) => void;
  warning: (message: string, data?: LogData) => void;
  error: (message: string, error: Error, extraData?: LogData) => void;
}

/**
 * During development use %O for readable output in VSCode terminal
 * During production use %j for readable output in CloudWatch
 */
const logDataFormatter = process.env.NODE_ENV === 'production' ? '%j' : '%O';

function createNamespaceLog(namespace: string) {
  const debugFunc = debug(namespace);
  return (entry: LogEntry) => {
    formatLog(debugFunc, entry);
  };
}

function formatLog(func: Debugger, entry: LogEntry) {
  func(
    `${entry.level.toUpperCase()}\t${entry.message}${
      entry.data ? ` ${logDataFormatter}` : '%s'
    }`,
    entry.data ?? ''
  );
}

export function createLogger(namespace: string): Logger {
  const log = createNamespaceLog(namespace);
  const logInfo = createNamespaceLog(`${namespace}:info`);
  const logWarning = createNamespaceLog(`${namespace}:warning`);
  const logError = createNamespaceLog(`${namespace}:error`);

  return {
    log,
    info(message, data) {
      logInfo({
        level: 'info',
        message,
        data,
      });
    },
    warning(message, data) {
      logWarning({
        level: 'warning',
        message,
        data,
      });
    },
    error(message, error, extraData) {
      logError({
        level: 'error',
        message,
        data: {
          errorType: error.name,
          errorMessage: error.message,
          stack: error.stack?.toString().split('\n'),
          data: extraData,
        },
      });
    },
  };
}

export function emptyLogger(): Logger {
  return {
    log: () => {
      return;
    },
    info: () => {
      return;
    },
    warning: () => {
      return;
    },
    error: () => {
      return;
    },
  };
}

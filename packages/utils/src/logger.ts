import debug, { Debugger } from 'debug';
import isNonEmptyArray from './array/isNonEmptyArray';

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

export class ErrorWithData extends Error {
  static extractNestedCauseData(error: ErrorWithData) {
    const collectedData: LogData[] = [];

    let tmpError: unknown = error;
    while (tmpError instanceof ErrorWithData) {
      collectedData.push(tmpError.extraData);
      tmpError = error.cause;
    }

    return collectedData;
  }

  readonly extraData: LogData;

  constructor(message: string, extraData: LogData, options?: ErrorOptions) {
    super(message, options);
    this.extraData = extraData;
  }
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
      // Collect data from ErrorWithData instances
      let data: LogData | undefined;
      if (error instanceof ErrorWithData) {
        const allData = [
          ...(extraData ? [extraData] : []),
          ...ErrorWithData.extractNestedCauseData(error),
        ];
        if (allData.length > 1) {
          data = {
            multiple: allData,
          };
        } else if (isNonEmptyArray(allData)) {
          data = allData[0];
        }
      } else {
        data = extraData;
      }

      logError({
        level: 'error',
        message,
        data: {
          errorType: error.name,
          errorMessage: error.message,
          stack: error.stack?.toString().split('\n'),
          data,
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

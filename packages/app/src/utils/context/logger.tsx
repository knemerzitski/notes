import { createContext, ReactNode, useContext } from 'react';
import { Logger } from '~utils/logging';
import { DefinedMap } from '~utils/map/defined-map';

const LoggerContext = createContext<Logger | null>(null);

const nsMemosByLogger = new DefinedMap<Logger, Record<string, Logger>>(
  new Map(),
  () => ({})
);

export function useLogger(namespace?: string): Logger | null {
  const logger = useContext(LoggerContext);
  if (!logger) {
    return null;
  }

  if (!namespace) {
    return logger;
  }

  const nsMemos = nsMemosByLogger.get(logger);

  const existingLogger = nsMemos[namespace];
  if (existingLogger) {
    return existingLogger;
  }

  const newLogger = logger.extend(namespace);
  nsMemos[namespace] = newLogger;

  return newLogger;
}

export function LoggerProvider({
  logger,
  children,
}: {
  logger: Logger;
  children: ReactNode;
}) {
  return <LoggerContext.Provider value={logger}>{children}</LoggerContext.Provider>;
}

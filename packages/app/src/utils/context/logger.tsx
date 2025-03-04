import { createContext, ReactNode, useContext } from 'react';

import { Logger } from '../../../../utils/src/logging';

const LoggerContext = createContext<Logger | null>(null);

export function useLogger(namespace?: string): Logger | null {
  const logger = useContext(LoggerContext);
  if (namespace != null) {
    return logger?.extend(namespace) ?? null;
  }
  return logger;
}

export function LoggerProvider({
  logger,
  children,
}: {
  logger: Logger | undefined;
  children: ReactNode;
}) {
  if (!logger) {
    return children;
  }

  return <LoggerContext.Provider value={logger}>{children}</LoggerContext.Provider>;
}

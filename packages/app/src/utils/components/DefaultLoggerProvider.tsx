import { ReactNode } from '@tanstack/react-router';
import { createLogger } from '~utils/logging';
import { LoggerProvider } from '../context/logger';

const logger = createLogger('react');

export function DefaultLoggerProvider({ children }: { children: ReactNode }) {
  return <LoggerProvider logger={logger}>{children}</LoggerProvider>;
}

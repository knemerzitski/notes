import { ReactNode } from '@tanstack/react-router';
import { useState } from 'react';
import { createLogger } from '~utils/logging';

import { LoggerProvider } from '../context/logger';

export function DefaultLoggerProvider({ children }: { children: ReactNode }) {
  const [logger] = useState(() => createLogger('react'));

  return <LoggerProvider logger={logger}>{children}</LoggerProvider>;
}

import { ReactNode } from '@tanstack/react-router';
import { createLogger } from '~utils/logging';

import { LoggerProvider } from '../context/logger';
import { useState } from 'react';

export function DefaultLoggerProvider({ children }: { children: ReactNode }) {
  const [logger] = useState(() => createLogger('react'));

  return <LoggerProvider logger={logger}>{children}</LoggerProvider>;
}

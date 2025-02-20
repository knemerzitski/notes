import { ReactNode } from 'react';

import { isDevToolsEnabled } from '../utils/dev-tools';

export function IsDevToolsEnabled({ children }: { children: ReactNode }) {
  if (!isDevToolsEnabled()) {
    return null;
  }

  return children;
}

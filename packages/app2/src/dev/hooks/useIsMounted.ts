/**
 * Copied from @tanstack/router packages/router-devtools/src/utils.ts
 */

import { useEffect, useState } from 'react';

export function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}

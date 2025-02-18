import { ReactNode } from 'react';

import { useIsLoading } from '../context/is-loading';

export function IsLoading({ children }: { children: ReactNode }) {
  const isLoading = useIsLoading();

  if (isLoading) {
    return children;
  }

  return null;
}

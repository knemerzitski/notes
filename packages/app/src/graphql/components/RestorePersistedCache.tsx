import { useApolloClient } from '@apollo/client';
import { ReactNode, useEffect, useState } from 'react';

import { useCacheRestorer } from '../context/cache-restorer';
import { IsCacheRestoredProvider } from '../context/is-cache-restored';

export function RestorePersistedCache({
  children,
  fallback,
}: {
  children?: ReactNode;
  fallback?: ReactNode;
}) {
  const client = useApolloClient();
  const restorer = useCacheRestorer();
  const [isRestored, setIsRestored] = useState(restorer.status === 'done');

  useEffect(() => {
    void restorer.restore().finally(() => {
      setIsRestored(true);
    });
  }, [restorer, client]);

  return (
    <IsCacheRestoredProvider value={isRestored}>
      {isRestored ? children : (fallback ?? children)}
    </IsCacheRestoredProvider>
  );
}

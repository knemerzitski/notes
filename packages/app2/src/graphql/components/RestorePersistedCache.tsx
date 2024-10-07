import { ReactNode, useEffect, useState } from 'react';
import { IsCacheRestoredProvider } from '../context/is-cache-restored';
import { useApolloClient } from '@apollo/client';
import { useCacheRestorer } from '../context/cache-restorer';

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
    if (restorer.status !== 'init') {
      return;
    }

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

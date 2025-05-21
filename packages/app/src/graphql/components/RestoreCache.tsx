import { ReactNode, useEffect, useState } from 'react';

import { useRestorer } from '../../persistence/context/restorer';
import { IsCacheRestoredProvider } from '../context/is-cache-restored';

export function RestoreCache({
  children,
  fallback,
}: {
  children?: ReactNode;
  fallback?: ReactNode;
}) {
  const restorer = useRestorer();
  const [isRestored, setIsRestored] = useState(restorer.status === 'done');

  useEffect(() => {
    void restorer.restore().finally(() => {
      setIsRestored(true);
    });
  }, [restorer]);

  return (
    <IsCacheRestoredProvider value={isRestored}>
      {isRestored ? children : (fallback ?? children)}
    </IsCacheRestoredProvider>
  );
}

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useCachePersistor } from '../context/cache-persistor';
import { IsCacheRestoredProvider } from '../context/is-cache-restored';

type Status =
  | {
      type: 'init';
    }
  | {
      type: 'restoring';
      persistor: ReturnType<typeof useCachePersistor>;
    }
  | {
      type: 'done';
      persistor: ReturnType<typeof useCachePersistor>;
    };

export function RestorePersistedCache({
  children,
  fallback,
}: {
  children?: ReactNode;
  fallback?: ReactNode;
}) {
  const persistor = useCachePersistor();

  const [isRestored, setIsRestored] = useState(false);
  const statusRef = useRef<Status>({ type: 'init' });

  useEffect(() => {
    if (statusRef.current.type !== 'init' && statusRef.current.persistor === persistor) {
      return;
    }

    setIsRestored(false);
    statusRef.current = {
      type: 'restoring',
      persistor,
    };

    void persistor.restore().finally(() => {
      statusRef.current.type = 'done';
      setIsRestored(true);
    });
  }, [persistor]);

  return (
    <IsCacheRestoredProvider value={isRestored}>
      {isRestored ? children : (fallback ?? children)}
    </IsCacheRestoredProvider>
  );
}

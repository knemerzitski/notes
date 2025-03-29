import { useEffect, useState } from 'react';

import { useCachePersistor } from '../context/cache-persistor';

export function useIsCachePending() {
  const cachePersistor = useCachePersistor();

  const [isPending, setIsPending] = useState(false);

  useEffect(
    () =>
      cachePersistor.eventBus.on(['pending'], () => {
        setTimeout(() => {
          setIsPending(true);
        });
      }),
    [cachePersistor]
  );

  useEffect(
    () =>
      cachePersistor.eventBus.on(['persisted', 'persistError', 'cancelled'], () => {
        setTimeout(() => {
          setIsPending(false);
        });
      }),
    [cachePersistor]
  );

  return isPending;
}

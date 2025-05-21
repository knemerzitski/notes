import { useEffect } from 'react';

import { usePersistor } from '../context/persistor';

export function ConfirmLeaveIsPending({
  triggerFlush = false,
}: {
  /**
   * Trigger immediate flush when CachePersistor is pending while leaving the page
   * @default false
   */
  triggerFlush?: boolean;
}) {
  const persistor = usePersistor();

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (persistor.isPending()) {
        e.preventDefault();
        if (triggerFlush) {
          void persistor.flush();
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [persistor, triggerFlush]);
  return null;
}

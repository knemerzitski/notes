import { useCallback } from 'react';
import { useBeforeUnload } from '../../utils/hooks/useBeforeUnload';
import { useCachePersistor } from '../context/cache-persistor';

export function ConfirmLeaveOnPendingPersistCache({
  triggerPersist = false,
}: {
  /**
   * Trigger immediate persist when CachePersistor is pending while leaving the page
   * @default false
   */
  triggerPersist?: boolean;
}) {
  const persistor = useCachePersistor(true);

  useBeforeUnload(
    useCallback(
      (e) => {
        if (!persistor) return;

        if (persistor.isPending()) {
          e.preventDefault();
          if (triggerPersist) {
            void persistor.persist();
          }
        }
      },
      [persistor, triggerPersist]
    )
  );

  return null;
}

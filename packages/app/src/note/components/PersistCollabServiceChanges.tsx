import { useEffect } from 'react';
import { useDebouncedCallback, Options } from 'use-debounce';

import { useCachePersistor } from '../../graphql/context/cache-persistor';
import { useBeforeUnload } from '../../utils/hooks/useBeforeUnload';
import { useCollabService } from '../hooks/useCollabService';

export function PersistCollabServiceChanges({
  wait = 1500,
  options = {
    maxWait: 10000,
  },
}: {
  /**
   * @default 1000 milliseconds
   */
  wait?: number;
  options?: Options;
}) {
  const cachePersistor = useCachePersistor();

  const maybeService = useCollabService(true);

  const debouncedPersist = useDebouncedCallback(
    async () => {
      await cachePersistor.persist();
    },
    wait,
    options
  );

  // Prevent leaving while debounce is pending
  useBeforeUnload((e) => {
    if (debouncedPersist.isPending()) {
      e.preventDefault();
      void debouncedPersist.flush();
    }
  });

  useEffect(() => {
    if (!maybeService) {
      return;
    }
    const service = maybeService;

    const eventBusOff = service.eventBus.on('appliedTypingOperation', () => {
      void debouncedPersist();
    });

    return () => {
      eventBusOff();
      void debouncedPersist.flush();
    };
  }, [debouncedPersist, maybeService]);

  return null;
}

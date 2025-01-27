import { useEffect } from 'react';
import { useDebouncedCallback, Options } from 'use-debounce';

import { CollabService } from '~collab/client/collab-service';

import { useCollabService } from '../hooks/useCollabService';

function canSubmit(
  service: Pick<CollabService, 'haveSubmittedChanges' | 'haveLocalChanges'>
) {
  return !service.haveSubmittedChanges() && service.haveLocalChanges();
}

export function LocalChangesToSubmittedRecordDebounced({
  wait = 1000,
  options,
}: {
  /**
   * @default 1000 milliseconds
   */
  wait?: number;
  options?: Options;
}) {
  const maybeService = useCollabService(true);

  const debouncedSubmitChanges = useDebouncedCallback(
    () => {
      if (!maybeService) {
        return;
      }
      const service = maybeService;

      if (canSubmit(service)) {
        service.submitChanges();
      }
    },
    wait,
    options
  );

  useEffect(() => {
    if (!maybeService) {
      return;
    }
    const service = maybeService;

    function attemptSubmit() {
      if (canSubmit(service)) {
        debouncedSubmitChanges();
      }
    }

    attemptSubmit();

    const eventsOff = service.eventBus.on(
      ['haveLocalChanges', 'submittedChangesAcknowledged'],
      attemptSubmit
    );

    return () => {
      eventsOff();
      debouncedSubmitChanges.flush();
    };
  }, [debouncedSubmitChanges, maybeService]);

  return null;
}

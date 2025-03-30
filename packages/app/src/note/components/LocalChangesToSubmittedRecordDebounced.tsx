import { useEffect } from 'react';
import { useDebouncedCallback, Options } from 'use-debounce';

import { CollabService } from '../../../../collab/src/client/collab-service';

import { useCollabService } from '../hooks/useCollabService';

export function LocalChangesToSubmittedRecordDebounced(
  props?: Parameters<typeof ServiceDefined>[0]
) {
  const service = useCollabService(true);

  if (!service) {
    return null;
  }

  return <ServiceDefined {...props} service={service} />;
}

function canSubmit(
  service: Pick<CollabService, 'haveSubmittedChanges' | 'haveLocalChanges'>
) {
  return !service.haveSubmittedChanges() && service.haveLocalChanges();
}

function ServiceDefined({
  service,
  wait = 1000,
  options,
}: {
  service: CollabService;
  /**
   * @default 1000 milliseconds
   */
  wait?: number;
  options?: Options;
}) {
  const debouncedSubmitChanges = useDebouncedCallback(
    () => {
      if (canSubmit(service)) {
        service.submitChanges();
      }
    },
    wait,
    options
  );

  useEffect(() => {
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
  }, [debouncedSubmitChanges, service]);

  return null;
}

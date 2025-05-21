import { useEffect } from 'react';
import { useDebouncedCallback, Options } from 'use-debounce';

import { CollabService } from '../../../../collab/src';

import { useCollabService } from '../hooks/useCollabService';
import { useHaveOtherUsersOpenedNote } from '../hooks/useHaveOtherUsersOpenedNote';

export function LocalChangesToSubmittedRecordDebounced({
  singleUser = {
    wait: 3000,
    options: {
      maxWait: 5000,
    },
  },
  multiUser = {
    wait: 450,
  },
  ...restProps
}: Omit<ToggleSingleOrMultipleUsersProps, 'service'>) {
  const service = useCollabService();

  return (
    <ToggleSingleOrMultipleUsers
      singleUser={singleUser}
      multiUser={multiUser}
      {...restProps}
      service={service}
    />
  );
}

type ToggleSingleOrMultipleUsersProps = Parameters<typeof ToggleSingleOrMultipleUsers>[0];

function ToggleSingleOrMultipleUsers({
  service,
  singleUser,
  multiUser,
}: {
  service: CollabService;
  singleUser?: Omit<ServiceDefinedProps, 'service'>;
  multiUser?: Omit<ServiceDefinedProps, 'service'>;
}) {
  const haveOtherUsersOpenedNote = useHaveOtherUsersOpenedNote();

  return (
    <ServiceDefined
      {...(haveOtherUsersOpenedNote ? multiUser : singleUser)}
      service={service}
    />
  );
}

function canSubmit(
  service: Pick<CollabService, 'haveSubmittedChanges' | 'haveLocalChanges'>
) {
  return !service.haveSubmittedChanges() && service.haveLocalChanges();
}

type ServiceDefinedProps = Parameters<typeof ServiceDefined>[0];

function ServiceDefined({
  service,
  wait = 2000,
  options,
}: {
  service: CollabService;
  /**
   * @default 2000 milliseconds
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

    const eventsOff = service.on(
      ['localChanges:have', 'submittedChanges:acknowledged'],
      attemptSubmit
    );

    return () => {
      eventsOff();
      debouncedSubmitChanges.flush();
    };
  }, [debouncedSubmitChanges, service]);

  // Stop submitting in case when user leaves the page
  useEffect(() => {
    const timeoutMs = 100;

    function handleBeforeUnload() {
      const isPending = debouncedSubmitChanges.isPending();
      if (!isPending) {
        return;
      }
      debouncedSubmitChanges.cancel();

      setTimeout(() => {
        // Must wrap in another timeout to prevent submit triggering if user decided to leave the page
        setTimeout(() => {
          debouncedSubmitChanges();
          debouncedSubmitChanges.flush();
        }, timeoutMs);
      }, timeoutMs);
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [debouncedSubmitChanges]);

  return null;
}

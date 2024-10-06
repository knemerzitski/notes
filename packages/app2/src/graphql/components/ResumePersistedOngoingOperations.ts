import { useEffect, useRef } from 'react';
import { resumeOngoingOperations } from '../link/persist/resume';
import { useApolloClient } from '@apollo/client';
import { useUpdateHandlersByName } from '../context/update-handlers-by-name';

type Status =
  | {
      type: 'init';
    }
  | {
      type: 'resuming';
      client: ReturnType<typeof useApolloClient>;
      updateHandlersByName: ReturnType<typeof useUpdateHandlersByName>;
    }
  | {
      type: 'done';
      client: ReturnType<typeof useApolloClient>;
      updateHandlersByName: ReturnType<typeof useUpdateHandlersByName>;
    };

export function ResumePersistedOngoingOperations() {
  const client = useApolloClient();
  const updateHandlersByName = useUpdateHandlersByName();

  const statusRef = useRef<Status>({ type: 'init' });

  useEffect(() => {
    if (
      statusRef.current.type !== 'init' &&
      statusRef.current.client === client &&
      statusRef.current.updateHandlersByName == updateHandlersByName
    ) {
      return;
    }

    statusRef.current = {
      type: 'resuming',
      client,
      updateHandlersByName,
    };

    void Promise.allSettled(
      resumeOngoingOperations(client, updateHandlersByName)
    ).finally(() => {
      statusRef.current.type = 'done';
    });
  }, [client, updateHandlersByName]);

  return null;
}

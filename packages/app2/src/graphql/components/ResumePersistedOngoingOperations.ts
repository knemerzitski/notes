import { useEffect, useRef } from 'react';
import { resumeOngoingOperations } from '../link/persist/resume';
import { useApolloClient } from '@apollo/client';
import { useGetDocumentUpdater } from '../context/get-document-updater';

type Status =
  | {
      type: 'init';
    }
  | {
      type: 'resuming';
      client: ReturnType<typeof useApolloClient>;
      getDocumentUpdater: ReturnType<typeof useGetDocumentUpdater>;
    }
  | {
      type: 'done';
      client: ReturnType<typeof useApolloClient>;
      getDocumentUpdater: ReturnType<typeof useGetDocumentUpdater>;
    };

export function ResumePersistedOngoingOperations() {
  const client = useApolloClient();
  const getDocumentUpdater = useGetDocumentUpdater();

  const statusRef = useRef<Status>({ type: 'init' });

  useEffect(() => {
    if (
      statusRef.current.type !== 'init' &&
      statusRef.current.client === client &&
      statusRef.current.getDocumentUpdater == getDocumentUpdater
    ) {
      return;
    }

    statusRef.current = {
      type: 'resuming',
      client,
      getDocumentUpdater,
    };

    void Promise.allSettled(resumeOngoingOperations(client, getDocumentUpdater)).finally(
      () => {
        statusRef.current.type = 'done';
      }
    );
  }, [client, getDocumentUpdater]);

  return null;
}

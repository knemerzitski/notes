import { useEffect } from 'react';
import { resumeOngoingOperations } from '../link/persist/resume';
import { useApolloClient } from '@apollo/client';
import { useUpdateHandlersByName } from '../context/update-handlers-by-name';

export function ResumePersistedOngoingOperations() {
  const client = useApolloClient();
  const updateHandlersByName = useUpdateHandlersByName();

  useEffect(() => {
    void resumeOngoingOperations(client, updateHandlersByName);
  }, [client, updateHandlersByName]);

  return null;
}

import { useEffect, useRef } from 'react';
import { resumeOngoingOperations } from '../link/persist/resume';
import { useApolloClient } from '@apollo/client';
import { useGetMutationUpdaterFn } from '../context/get-mutation-updater-fn';

export function ResumePersistedOngoingOperations() {
  const client = useApolloClient();
  const getMutationUpdaterFn = useGetMutationUpdaterFn();

  const resumedOperationIdsRef = useRef(new Set<string>());

  useEffect(() => {
    void Promise.allSettled(
      resumeOngoingOperations(client, getMutationUpdaterFn, {
        filterFn: (op) => {
          if (resumedOperationIdsRef.current.has(op.id)) {
            return false;
          }

          resumedOperationIdsRef.current.add(op.id);
          return true;
        },
      })
    ).then((results) => {
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          resumedOperationIdsRef.current.delete(result.value.id);
        }
      }
    });
  }, [client, getMutationUpdaterFn]);

  return null;
}

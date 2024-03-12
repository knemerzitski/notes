import { useCallback } from 'react';

import { ClientSession } from '../../__generated__/graphql';
import useSessionMutations from '../state/useSessionMutations';

export default function useForgetSession() {
  const { deleteSession } = useSessionMutations();

  const startDeleteSession = useCallback(
    (session: ClientSession) => {
      deleteSession(String(session.key));
    },
    [deleteSession]
  );

  return startDeleteSession;
}

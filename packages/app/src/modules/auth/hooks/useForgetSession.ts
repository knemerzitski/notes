import { useCallback } from 'react';

import { ClientSession } from '../../__generated__/graphql';
import useSessionMutations from '../state/useSessionMutations';

export default function useForgetSession() {
  const { deleteSession } = useSessionMutations();

  const startDeleteSession = useCallback(
    (session: Pick<ClientSession, 'id'>) => {
      deleteSession(String(session.id));
    },
    [deleteSession]
  );

  return startDeleteSession;
}

import { useCallback } from 'react';

import { SavedSession } from '../../__generated__/graphql';
import useSessionMutations from '../state/useSessionMutations';

export default function useForgetSession() {
  const { deleteSession } = useSessionMutations();

  const startDeleteSession = useCallback(
    (session: SavedSession) => {
      deleteSession(String(session.key));
    },
    [deleteSession]
  );

  return startDeleteSession;
}

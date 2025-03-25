import { useNavigate } from '@tanstack/react-router';
import { gql } from '../../__generated__';
import { useUserId } from '../context/user-id';
import { useApolloClient, useQuery } from '@apollo/client';
import { useEffect } from 'react';
import { setUserSessionExpiredPromptedToSignIn } from '../models/local-user/set-session-expired-prompted-to-sign-in';
import { useLogger } from '../../utils/context/logger';
import { useCachePersistor } from '../../graphql/context/cache-persistor';

const SessionExpiredPromtSignInOnce_Query = gql(`
  query SessionExpiredPromtSignInOnce_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        sessionExpired
        sessionExpiredPromptedToSignIn
      }
    }
  }
`);

export function SessionExpiredPromptSignInOnce() {
  const logger = useLogger('SessionExpiredPromptSignInOnce');

  const cachePersistor = useCachePersistor();
  const client = useApolloClient();
  const navigate = useNavigate();

  const userId = useUserId();
  const { data } = useQuery(SessionExpiredPromtSignInOnce_Query, {
    variables: {
      id: userId,
    },
    fetchPolicy: 'cache-only',
  });

  const user = data?.signedInUser.local;
  const prompt = user
    ? user.sessionExpired && !user.sessionExpiredPromptedToSignIn
    : false;

  if (user && user.sessionExpired && user.sessionExpiredPromptedToSignIn) {
    logger?.debug('alreadyPrompted', userId);
  }

  useEffect(() => {
    if (!prompt) {
      return;
    }

    logger?.debug('promptingOnce', userId);

    void navigate({
      to: '.',
      search: (prev) => ({ ...prev, signIn: true }),
    }).finally(() => {
      // Remember that prompted so it won't be triggered again
      setUserSessionExpiredPromptedToSignIn(userId, true, client.cache);

      // Persist immediately
      void cachePersistor.persist();
    });
  }, [logger, cachePersistor, client, navigate, userId, prompt]);

  return null;
}

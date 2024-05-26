import { useCallback } from 'react';
import { gql } from '../../../__generated__/gql';
import { useApolloClient } from '@apollo/client';

const QUERY = gql(`
  query UserForgetUser {
    signedInUsers @client {
      id
    }
    currentSignedInUser @client {
      id
    }
  }
`);

export default function useForgetUser() {
  const apolloClient = useApolloClient();

  return useCallback(
    (userId: string) => {
      apolloClient.cache.updateQuery(
        {
          query: QUERY,
        },
        (data) => {
          if (!data) return;

          return {
            signedInUsers: data.signedInUsers.filter(({ id }) => id !== userId),
            currentSignedInUser:
              data.currentSignedInUser?.id !== userId ? data.currentSignedInUser : null,
          };
        }
      );
    },
    [apolloClient]
  );
}

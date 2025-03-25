import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';
import { useUserId } from '../context/user-id';

const UseIsSessionExpired_Query = gql(`
  query UseIsSessionExpired_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      local {
        id
        sessionExpired
      }
    }
  }
`);

export function useIsSessionExpired() {
  const userId = useUserId();
  const { data } = useQuery(UseIsSessionExpired_Query, {
    variables: {
      id: userId,
    },
    fetchPolicy: 'cache-only',
  });

  return data?.signedInUser.local.sessionExpired ?? false;
}

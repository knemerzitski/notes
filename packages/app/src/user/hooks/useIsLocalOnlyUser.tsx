import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';
import { useUserId } from '../context/user-id';

const UseIsLocalOnlyUser_Query = gql(`
  query UseIsLocalOnlyUser_Query($id: ObjectID!) {
    signedInUser(by: { id: $id }) {
      id
      localOnly
    }
  }
`);

export function useIsLocalOnlyUser() {
  const userId = useUserId();
  const { data } = useQuery(UseIsLocalOnlyUser_Query, {
    variables: {
      id: userId,
    },
    fetchPolicy: 'cache-only',
  });

  return data?.signedInUser.localOnly ?? false;
}

import { useQuery } from '@apollo/client';

import { ReactNode } from 'react';

import { gql } from '../../__generated__';
import { UserIdProvider } from '../context/user-id';

const CurrentUserIdProvider_Query = gql(`
  query CurrentUserIdProvider_Query {
    currentSignedInUser {
      id
    }
  }
`);

export function CurrentUserIdProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery(CurrentUserIdProvider_Query, {
    fetchPolicy: 'cache-only',
  });
  if (!data) return;

  const user = data.currentSignedInUser;

  return <UserIdProvider userId={user.id}>{children}</UserIdProvider>;
}

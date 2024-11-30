import { gql } from '../../__generated__';
import { useQuery } from '@apollo/client';
import { UserIdProvider } from '../context/user-id';
import { ReactNode } from 'react';

const CurrentUserIdProvider_Query = gql(`
  query CurrentUserIdProvider_Query {
    currentSignedInUser @client {
      id
    }
  }
`);

export function CurrentUserIdProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery(CurrentUserIdProvider_Query);
  if (!data) return;

  const user = data.currentSignedInUser;

  return <UserIdProvider userId={user.id}>{children}</UserIdProvider>;
}

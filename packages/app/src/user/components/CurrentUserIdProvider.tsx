import { useQuery } from '@apollo/client';

import { ReactNode } from 'react';

import { gql } from '../../__generated__';
import { UserIdProvider } from '../context/user-id';


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

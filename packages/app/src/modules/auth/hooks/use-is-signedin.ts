import { useSuspenseQuery } from '@apollo/client';

import { gql } from '../../../__generated__';

const QUERY = gql(`
  query UseIsSignedIn {
    currentSignedInUser @client {
      id
    }
  }
`);

export function useIsSignedIn(): boolean {
  const { data } = useSuspenseQuery(QUERY);
  return data.currentSignedInUser?.id != null;
}

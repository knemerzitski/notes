import { ApolloCache } from '@apollo/client';

import { gql } from '../../__generated__';

const GetDefaultPerPageCount_Query = gql(`
  query GetDefaultPerPageCount_Query {
    devicePreferences {
      defaultPerPageCount
    }
  }
`);

export const fallbackValue = 20;

export function getDefaultPerPageCount(cache: Pick<ApolloCache<unknown>, 'readQuery'>) {
  const data = cache.readQuery({
    query: GetDefaultPerPageCount_Query,
  });

  return data?.devicePreferences.defaultPerPageCount ?? fallbackValue;
}

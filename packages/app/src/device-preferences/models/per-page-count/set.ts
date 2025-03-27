import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';

const SetDefaultPerPageCount_Query = gql(`
  query SetDefaultPerPageCount_Query {
    devicePreferences {
      defaultPerPageCount
    }
  }
`);

export function setDefaultPerPageCount(
  perPageCount: number,
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: SetDefaultPerPageCount_Query,
    data: {
      __typename: 'Query',
      devicePreferences: {
        __typename: 'DevicePreferences',
        defaultPerPageCount: perPageCount,
      },
    },
  });
}

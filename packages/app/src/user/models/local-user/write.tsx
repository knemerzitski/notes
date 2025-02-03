import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { WriteLocalUserQueryQuery } from '../../../__generated__/graphql';

const WriteLocalUser_Query = gql(`
  query WriteLocalUser_Query {
    localUser {
      id
      profile {
        displayName
      }
      local {
        id
      }
    }
  }
`);

export function writeLocalUser(
  localUser: WriteLocalUserQueryQuery['localUser'],
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: WriteLocalUser_Query,
    data: {
      __typename: 'Query',
      localUser,
    },
  });
}

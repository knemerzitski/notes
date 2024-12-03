import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { LayoutMode } from '../../../__generated__/graphql';

const SetLayoutMode_Query = gql(`
  query SetLayoutMode_Query {
    devicePreferences {
      layoutMode
    }
  }
`);

export function setLayoutMode(
  newLayoutMode: LayoutMode,
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: SetLayoutMode_Query,
    data: {
      __typename: 'Query',
      devicePreferences: {
        __typename: 'DevicePreferences',
        layoutMode: newLayoutMode,
      },
    },
  });
}

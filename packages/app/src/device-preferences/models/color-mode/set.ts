import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';
import { ColorMode } from '../../../__generated__/graphql';

const SetColorMode_Query = gql(`
  query SetColorMode_Query {
    devicePreferences {
      colorMode
    }
  }
`);
export function setColorMode(
  newColorMode: ColorMode,
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: SetColorMode_Query,
    data: {
      __typename: 'Query',
      devicePreferences: {
        __typename: 'DevicePreferences',
        colorMode: newColorMode,
      },
    },
  });
}

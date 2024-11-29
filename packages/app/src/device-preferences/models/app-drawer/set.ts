import { ApolloCache } from '@apollo/client';
import { gql } from '../../../__generated__';

const SetDrawerOpen_Query = gql(`
  query SetDrawerOpen_Query {
    devicePreferences {
      desktop {
        appDrawerOpen
      }
    }
  }  
`);

export function setAppDrawerOpen(
  open: boolean,
  cache: Pick<ApolloCache<unknown>, 'writeQuery'>
) {
  cache.writeQuery({
    query: SetDrawerOpen_Query,
    data: {
      __typename: 'Query',
      devicePreferences: {
        __typename: 'DevicePreferences',
        desktop: {
          __typename: 'DesktopDevicePreferences',
          appDrawerOpen: open,
        },
      },
    },
  });
}

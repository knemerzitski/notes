import { ApolloCache } from '@apollo/client';

import { gql } from '../../../__generated__';

const IsDrawerOpen_Query = gql(`
  query IsDrawerOpen_Query {
    devicePreferences {
      desktop {
        appDrawerOpen
      }
    }
  }  
`);

export function isAppDrawerOpen(cache: Pick<ApolloCache<unknown>, 'readQuery'>): boolean {
  return (
    cache.readQuery({
      query: IsDrawerOpen_Query,
    })?.devicePreferences.desktop.appDrawerOpen ?? false
  );
}

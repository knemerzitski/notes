import { useApolloClient, useQuery } from '@apollo/client';

import { useCallback } from 'react';

import { gql } from '../../__generated__';
import { LayoutMode } from '../../__generated__/graphql';
import { setLayoutMode } from '../models/layout-mode/set';

const UseLayoutMode_Query = gql(`
  query UseLayoutMode_Query {
    devicePreferences {
      layoutMode
    }
  }
`);

export function useLayoutMode() {
  const client = useApolloClient();

  const { data } = useQuery(UseLayoutMode_Query, {
    fetchPolicy: 'cache-only',
  });

  const layoutMode = data?.devicePreferences.layoutMode ?? LayoutMode.RESPONSIVE;

  const _setLayoutMode = useCallback(
    (newLayoutMode: LayoutMode) => {
      setLayoutMode(newLayoutMode, client.cache);
    },
    [client]
  );

  return [layoutMode, _setLayoutMode] as const;
}

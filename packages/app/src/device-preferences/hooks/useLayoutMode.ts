import { useApolloClient, useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { useCallback } from 'react';
import { LayoutMode } from '../../__generated__/graphql';
import { setLayoutMode } from '../models/layout-mode/set';

const UseLayoutMode_Query = gql(`
  query UseLayoutMode_Query {
    devicePreferences @client {
      layoutMode
    }
  }
`);

export function useLayoutMode() {
  const client = useApolloClient();

  const { data } = useQuery(UseLayoutMode_Query);

  const layoutMode = data?.devicePreferences.layoutMode ?? LayoutMode.RESPONSIVE;

  const _setLayoutMode = useCallback(
    (newLayoutMode: LayoutMode) => {
      setLayoutMode(newLayoutMode, client.cache);
    },
    [client]
  );

  return [layoutMode, _setLayoutMode] as const;
}

import { useApolloClient, useQuery } from '@apollo/client';

import { useCallback } from 'react';

import { gql } from '../../__generated__';
import { ColorMode } from '../../__generated__/graphql';
import { useBootstrapCache } from '../../bootstrap/context/bootstrap-cache';
import { useIsCacheRestored } from '../../graphql/context/is-cache-restored';
import { setColorMode } from '../models/color-mode/set';

const UseColorMode_Query = gql(`
  query UseColorMode_Query {
    devicePreferences @client {
      colorMode
    }
  }
`);

export function useColorMode() {
  const isCacheRestored = useIsCacheRestored();
  const bootstrapCache = useBootstrapCache(true);
  const client = useApolloClient();

  const { data } = useQuery(UseColorMode_Query);

  const colorMode = isCacheRestored
    ? (data?.devicePreferences.colorMode ??
      bootstrapCache?.get('colorMode') ??
      ColorMode.SYSTEM)
    : (bootstrapCache?.get('colorMode') ?? ColorMode.SYSTEM);

  const _setColorMode = useCallback(
    (newColorMode: ColorMode) => {
      if (isCacheRestored) {
        setColorMode(newColorMode, client.cache);
      }

      bootstrapCache?.set('colorMode', newColorMode);
    },
    [client, bootstrapCache, isCacheRestored]
  );

  return [colorMode, _setColorMode] as const;
}

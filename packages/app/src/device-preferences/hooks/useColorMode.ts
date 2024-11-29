import { useApolloClient, useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { usePreferencesStorage } from '../context/preferences-storage';
import { useCallback } from 'react';
import { ColorMode } from '../../__generated__/graphql';
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
  const preferenceStorage = usePreferencesStorage(true);
  const client = useApolloClient();

  const { data } = useQuery(UseColorMode_Query);

  const colorMode = isCacheRestored
    ? (data?.devicePreferences.colorMode ??
      preferenceStorage?.getColorMode() ??
      ColorMode.SYSTEM)
    : (preferenceStorage?.getColorMode() ?? ColorMode.SYSTEM);

  const _setColorMode = useCallback(
    (newColorMode: ColorMode) => {
      if (isCacheRestored) {
        setColorMode(newColorMode, client.cache);
      }

      preferenceStorage?.setColorMode(newColorMode);
    },
    [client, preferenceStorage, isCacheRestored]
  );

  return [colorMode, _setColorMode] as const;
}

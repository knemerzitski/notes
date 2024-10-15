import { useApolloClient, useQuery } from '@apollo/client';
import { gql } from '../../__generated__';
import { usePreferencesStorage } from '../context/preferences-storage';
import { useCallback } from 'react';
import { ColorMode } from '../../__generated__/graphql';
import { useIsCacheRestored } from '../../graphql/context/is-cache-restored';

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
    : preferenceStorage?.getColorMode();

  const setColorMode = useCallback(
    (newColorMode: ColorMode) => {
      if (isCacheRestored) {
        client.writeQuery({
          query: UseColorMode_Query,
          data: {
            __typename: 'Query',
            devicePreferences: {
              __typename: 'DevicePreferences',
              colorMode: newColorMode,
            },
          },
        });
      }

      preferenceStorage?.setColorMode(newColorMode);
    },
    [client, preferenceStorage, isCacheRestored]
  );

  return [colorMode, setColorMode];
}

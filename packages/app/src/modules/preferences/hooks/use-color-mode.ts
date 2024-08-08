import { useApolloClient, useSuspenseQuery } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../../__generated__/gql';
import { ColorMode } from '../../../__generated__/graphql';
import { LocalStoragePrefix, localStorageKey } from '../../storage/local-storage';

const QUERY = gql(`
  query UseColorMode {
    preferences @client {
      colorMode
    }
  }
`);

const STORAGE_KEY = localStorageKey(LocalStoragePrefix.THEME, 'colorMode');

function setColorModeInStorage(colorMode: ColorMode | null | undefined) {
  if (colorMode) {
    localStorage.setItem(STORAGE_KEY, colorMode);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getColorModeInStorage() {
  return (localStorage.getItem(STORAGE_KEY) ?? ColorMode.SYSTEM) as ColorMode;
}

export function useColorMode(): [ColorMode, (newColorMode: ColorMode) => void] {
  const apolloClient = useApolloClient();
  const { data } = useSuspenseQuery(QUERY);

  const setColorMode = useCallback(
    (newColorMode: ColorMode) => {
      apolloClient.writeQuery({
        query: QUERY,
        data: {
          preferences: {
            colorMode: newColorMode,
          },
        },
      });
      setColorModeInStorage(newColorMode);
    },
    [apolloClient]
  );

  return [data.preferences.colorMode, setColorMode];
}

import { useApolloClient, useSuspenseQuery } from '@apollo/client';
import { gql } from '../../../__generated__/gql';
import { ColorMode } from '../../../__generated__/graphql';
import { useCallback } from 'react';

const QUERY = gql(`
  query UseColorMode {
    preferences @client {
      colorMode
    }
  }
`);

export default function useColorMode(): [ColorMode, (newColorMode: ColorMode) => void] {
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
    },
    [apolloClient]
  );

  return [data.preferences.colorMode, setColorMode];
}

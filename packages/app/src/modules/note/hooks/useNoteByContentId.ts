import { useCallback } from 'react';
import { useApolloClient } from '@apollo/client';
import { gql } from '../../../__generated__/gql';

const QUERY = gql(`
  query UseNoteContentIdToId($contentId: String!) {
    note(contentId: $contentId) @client {
      id
      __typename
    }
  }
`);

export default function useNoteByContentId() {
  const apolloClient = useApolloClient();

  return useCallback(
    (noteContentId: string) => {
      const cache = apolloClient.cache;
      return cache.readQuery({
        query: QUERY,
        variables: {
          contentId: noteContentId,
        },
      })?.note;
    },
    [apolloClient]
  );
}

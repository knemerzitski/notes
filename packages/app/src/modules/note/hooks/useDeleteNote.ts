import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import { gql } from '../../../__generated__/gql';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import isErrorCode from '../../apollo-client/utils/isErrorCode';
import ErrorLink from '../../apollo-client/links/error-link';
import { useCustomApolloClient } from '../../apollo-client/context/CustomApolloClientProvider';
import { getCurrentUserId } from '../../auth/user';

const MUTATION = gql(`
  mutation UseDeleteNote($input: DeleteNoteInput!) {
    deleteNote(input: $input) {
      deleted
    }
  }
`);

export default function useDeleteNote() {
  const customApolloClient = useCustomApolloClient();
  const [deleteNote] = useMutation(MUTATION, {
    context: {
      [ErrorLink.IGNORE_CONTEXT_KEY]: [GraphQLErrorCode.NotFound],
    },
    errorPolicy: 'all',
  });

  return useCallback(
    async (deleteContentId: string) => {
      const result = await deleteNote({
        variables: {
          input: {
            contentId: deleteContentId,
          },
        },
        optimisticResponse: {
          deleteNote: {
            deleted: true,
          },
        },
        update(cache, result) {
          const { data } = result;
          if (!data?.deleteNote.deleted) return;

          customApolloClient.evict({
            id: cache.identify({
              contentId: deleteContentId,
              userId: getCurrentUserId(cache),
              __typename: 'Note',
            }),
          });
          customApolloClient.gc();
        },
      });

      if (isErrorCode(result.errors, GraphQLErrorCode.NotFound)) {
        const cache = customApolloClient.cache;

        customApolloClient.evict({
          id: cache.identify({
            contentId: deleteContentId,
            userId: getCurrentUserId(cache),
            __typename: 'Note',
          }),
        });
        customApolloClient.gc();
        return true;
      }

      return result.data?.deleteNote.deleted ?? false;
    },
    [deleteNote, customApolloClient]
  );
}

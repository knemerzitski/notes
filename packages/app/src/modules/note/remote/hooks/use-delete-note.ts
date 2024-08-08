import { useMutation } from '@apollo/client';
import { useCallback } from 'react';

import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';

import { gql } from '../../../../__generated__/gql';
import { useCustomApolloClient } from '../../../apollo-client/context/custom-apollo-client-provider';
import { ErrorLink } from '../../../apollo-client/links/error-link';
import { isErrorCode } from '../../../apollo-client/utils/is-error-code';
import { getCurrentUserId } from '../../../auth/user';

import { useSnackbarError } from '../../../common/components/snackbar-alert-provider';

import { deleteNoteFromNotesConnection } from './use-delete-note-from-notes-connections';

const MUTATION = gql(`
  mutation UseDeleteNote($input: DeleteNoteInput!) {
    deleteNote(input: $input) {
      deleted
    }
  }
`);

export function useDeleteNote() {
  const customApolloClient = useCustomApolloClient();
  const [deleteNote] = useMutation(MUTATION, {
    context: {
      [ErrorLink.IGNORE_CONTEXT_KEY]: [GraphQLErrorCode.NOT_FOUND],
    },
    errorPolicy: 'all',
  });
  const showError = useSnackbarError();

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

          deleteNoteFromNotesConnection(cache, deleteContentId);
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

      if (isErrorCode(result.errors, GraphQLErrorCode.NOT_FOUND)) {
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

      const deleted = result.data?.deleteNote.deleted ?? false;
      if (!deleted) {
        showError('Failed to delete note');
      }

      return deleted;
    },
    [deleteNote, customApolloClient, showError]
  );
}

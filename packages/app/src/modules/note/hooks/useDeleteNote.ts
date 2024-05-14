import { useApolloClient, useMutation } from '@apollo/client';
import { useCallback } from 'react';

import useNoteByContentId from './useNoteByContentId';
import { gql } from '../../../__generated__/gql';
import { removeActiveNotes } from '../active-notes';
import { GraphQLErrorCode } from '~api-app-shared/graphql/error-codes';
import isErrorCode from '../../apollo-client/utils/isErrorCode';
import ErrorLink from '../../apollo-client/links/error-link';

const MUTATION = gql(`
  mutation UseDeleteNote($input: DeleteNoteInput!) {
    deleteNote(input: $input) {
      deleted
    }
  }
`);

export default function useDeleteNote() {
  const apolloClinet = useApolloClient();
  const [deleteNote] = useMutation(MUTATION, {
    context: {
      [ErrorLink.IGNORE_CONTEXT_KEY]: [GraphQLErrorCode.NotFound],
    },
    errorPolicy: 'all',
  });

  const noteContentIdToId = useNoteByContentId();

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

          const note = noteContentIdToId(deleteContentId);
          if (note) {
            removeActiveNotes(cache, [note]);
            cache.evict({
              id: cache.identify(note),
            });
            cache.gc();
          }
        },
      });

      if (isErrorCode(result.errors, GraphQLErrorCode.NotFound)) {
        console.log('is notfound');
        const cache = apolloClinet.cache;
        const note = noteContentIdToId(deleteContentId);
        if (note) {
          removeActiveNotes(cache, [note]);
          cache.evict({
            id: cache.identify(note),
          });
          cache.gc();
          return true;
        }
        return false;
      }

      return result.data?.deleteNote.deleted ?? false;
    },
    [deleteNote, noteContentIdToId, apolloClinet]
  );
}

import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { makeFragmentData } from '../../__generated__';
import {
  DeleteNotePayloadFragmentDoc,
  UserNoteLinkByInput,
} from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { noteSerializationKey_orderMatters } from '../../graphql/utils/serialization-key';
import { isLocalOnlyNote } from '../models/local-note/is-local-only';
import { DeleteNote } from '../mutations/DeleteNote';
import { getUserNoteLinkId, parseUserNoteLinkByInput } from '../utils/id';

export function useDeleteNote() {
  const client = useApolloClient();
  const [deleteNoteMutation] = useMutation(DeleteNote);

  return useCallback(
    (by: UserNoteLinkByInput) => {
      const { userId, noteId } = parseUserNoteLinkByInput(by, client.cache);

      return deleteNoteMutation({
        local: isLocalOnlyNote({ id: noteId }, client.cache),
        variables: {
          input: {
            authUser: {
              id: userId,
            },
            note: {
              id: noteId,
            },
          },
        },
        context: {
          serializationKey: noteSerializationKey_orderMatters(userId),
        },
        errorPolicy: 'all',
        optimisticResponse: {
          __typename: 'Mutation',
          deleteNote: {
            __typename: 'DeleteNotePayload',
            ...makeFragmentData(
              {
                __typename: 'DeleteNotePayload',
                userNoteLinkId: getUserNoteLinkId(noteId, userId),
              },
              DeleteNotePayloadFragmentDoc
            ),
          },
        },
      });
    },
    [deleteNoteMutation, client]
  );
}

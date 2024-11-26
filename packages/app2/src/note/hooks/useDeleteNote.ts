import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';
import {
  DeleteNotePayloadFragmentDoc,
  UserNoteLinkByInput,
} from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { getUserNoteLinkId, parseUserNoteLinkByInput } from '../utils/id';
import { DeleteNote } from '../mutations/DeleteNote';
import { makeFragmentData } from '../../__generated__';
import { isLocalOnlyNote } from '../models/local-note/is-local-only';
import { noteSerializationKey } from '../../graphql/utils/serialization-key';

export function useDeleteNote() {
  const client = useApolloClient();
  const [deleteNoteMutation] = useMutation(DeleteNote);

  return useCallback(
    (by: UserNoteLinkByInput) => {
      const { userId, noteId } = parseUserNoteLinkByInput(by, client.cache);

      return deleteNoteMutation({
        local: isLocalOnlyNote({ noteId }, client.cache),
        variables: {
          input: {
            noteId,
            userId,
          },
        },
        context: {
          serializationKey: noteSerializationKey(noteId, userId, 'move'),
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

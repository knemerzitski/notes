import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { makeFragmentData } from '../../__generated__';
import {
  DeleteShareNotePayloadFragmentDoc,
  UserNoteLinkByInput,
} from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { noteSerializationKey_sharing } from '../../graphql/utils/serialization-key';
import { DeleteShareNote } from '../mutations/DeleteShareNote';
import { parseUserNoteLinkByInput } from '../utils/id';

export function useDeleteShareNote() {
  const client = useApolloClient();
  const [deleteShareNoteMutation] = useMutation(DeleteShareNote);

  return useCallback(
    (by: UserNoteLinkByInput) => {
      const { userId, noteId } = parseUserNoteLinkByInput(by, client.cache);

      return deleteShareNoteMutation({
        variables: {
          input: {
            noteId,
          },
        },
        errorPolicy: 'all',
        context: {
          serializationKey: noteSerializationKey_sharing(userId),
        },
        optimisticResponse: {
          __typename: 'Mutation',
          deleteShareNote: {
            __typename: 'DeleteShareNotePayload',
            ...makeFragmentData(
              {
                __typename: 'DeleteShareNotePayload',
                note: {
                  __typename: 'Note',
                  id: noteId,
                },
                shareAccessId: null,
              },
              DeleteShareNotePayloadFragmentDoc
            ),
          },
        },
      });
    },
    [deleteShareNoteMutation, client]
  );
}

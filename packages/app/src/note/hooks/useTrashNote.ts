import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { makeFragmentData } from '../../__generated__';
import {
  MovableNoteCategory,
  NoteCategory,
  TrashUserNoteLinkPayloadFragmentDoc,
  UserNoteLinkByInput,
} from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { noteSerializationKey_orderMatters } from '../../graphql/utils/serialization-key';
import { isLocalOnlyNote } from '../models/local-note/is-local-only';
import { getCategoryName } from '../models/note/category-name';
import { TrashUserNoteLink } from '../mutations/TrashUserNoteLink';
import { getUserNoteLinkId, parseUserNoteLinkByInput } from '../utils/id';
import { toMovableNoteCategory } from '../utils/note-category';

export function useTrashNote() {
  const client = useApolloClient();
  const [trashNoteMutation] = useMutation(TrashUserNoteLink);

  return useCallback(
    (by: UserNoteLinkByInput) => {
      const { userId, noteId } = parseUserNoteLinkByInput(by, client.cache);

      // Assume in 30 days
      const deletedAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

      return trashNoteMutation({
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
        errorPolicy: 'all',
        context: {
          serializationKey: noteSerializationKey_orderMatters(userId),
        },
        optimisticResponse: {
          __typename: 'Mutation',
          trashUserNoteLink: {
            __typename: 'TrashUserNoteLinkPayload',
            ...makeFragmentData(
              {
                __typename: 'TrashUserNoteLinkPayload',
                originalCategoryName:
                  toMovableNoteCategory(getCategoryName(by, client.cache)) ??
                  MovableNoteCategory.DEFAULT,
                userNoteLink: {
                  __typename: 'UserNoteLink',
                  id: getUserNoteLinkId(noteId, userId),
                  // Assume in 30 days
                  deletedAt,
                  categoryName: NoteCategory.TRASH,
                },
              },
              TrashUserNoteLinkPayloadFragmentDoc
            ),
          },
        },
      });
    },
    [trashNoteMutation, client]
  );
}

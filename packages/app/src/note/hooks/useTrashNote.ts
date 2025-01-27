import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { makeFragmentData } from '../../__generated__';
import {
  NoteCategory,
  TrashUserNoteLinkPayloadFragmentDoc,
  UserNoteLinkByInput,
} from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { noteSerializationKey_orderMatters } from '../../graphql/utils/serialization-key';
import { isLocalOnlyNote } from '../models/local-note/is-local-only';
import { updateConnectionCategoryName } from '../models/note/connection-category-name';
import { updateOriginalCategoryName } from '../models/note/original-category-name';
import { TrashUserNoteLink } from '../mutations/TrashUserNoteLink';
import { getUserNoteLinkId, parseUserNoteLinkByInput } from '../utils/id';

export function useTrashNote() {
  const client = useApolloClient();
  const [trashNoteMutation] = useMutation(TrashUserNoteLink);

  return useCallback(
    (by: UserNoteLinkByInput) => {
      const { userId, noteId } = parseUserNoteLinkByInput(by, client.cache);

      // Before changing field `categoryName`, remember connection category where note is kept
      updateConnectionCategoryName({ noteId }, client.cache);
      // Remember category if its restored later
      updateOriginalCategoryName({ noteId }, client.cache);

      // Assume in 30 days
      const deletedAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

      return trashNoteMutation({
        local: isLocalOnlyNote({ id: noteId }, client.cache),
        variables: {
          input: {
            noteId,
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

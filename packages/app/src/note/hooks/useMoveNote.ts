import { useApolloClient } from '@apollo/client';
import { useCallback } from 'react';

import { makeFragmentData } from '../../__generated__';
import {
  MovableNoteCategory,
  MoveUserNoteLinkInput,
  MoveUserNoteLinkPayloadFragmentDoc,
  NoteCategory,
  UserNoteLinkByInput,
} from '../../__generated__/graphql';
import { useMutation } from '../../graphql/hooks/useMutation';
import { noteSerializationKey_orderMatters } from '../../graphql/utils/serialization-key';
import { isLocalOnlyNote } from '../models/local-note/is-local-only';
import {
  getConnectionCategoryName,
  updateConnectionCategoryName,
} from '../models/note/connection-category-name';
import { MoveUserNoteLink } from '../mutations/MoveUserNoteLink';
import {
  getUserNoteLinkId,
  getUserNoteLinkIdFromByInput,
  parseUserNoteLinkByInput,
} from '../utils/id';

export function useMoveNote() {
  const client = useApolloClient();
  const [moveNoteMutation] = useMutation(MoveUserNoteLink);

  return useCallback(
    (by: UserNoteLinkByInput, location: MoveUserNoteLinkInput['location']) => {
      const { userId, noteId } = parseUserNoteLinkByInput(by, client.cache);

      if (noteId === location?.anchorNoteId) {
        return Promise.resolve(false);
      }

      const currentCategory = getConnectionCategoryName({ noteId }, client.cache);
      if (currentCategory === location?.categoryName && location?.anchorNoteId == null) {
        return Promise.resolve(false);
      }

      // Before changing field `categoryName`, remember connection category
      updateConnectionCategoryName({ noteId }, client.cache);

      return moveNoteMutation({
        local: isLocalOnlyNote({ id: noteId }, client.cache),
        variables: {
          input: {
            noteId,
            location,
          },
        },
        errorPolicy: 'all',
        context: {
          serializationKey: noteSerializationKey_orderMatters(userId),
        },
        optimisticResponse: {
          __typename: 'Mutation',
          moveUserNoteLink: {
            __typename: 'MoveUserNoteLinkPayload',
            ...makeFragmentData(
              {
                __typename: 'MoveUserNoteLinkPayload',
                location: {
                  __typename: 'NoteLocation',
                  categoryName: location?.categoryName ?? MovableNoteCategory.DEFAULT,
                  anchorUserNoteLink: location?.anchorNoteId
                    ? {
                        __typename: 'UserNoteLink',
                        id: getUserNoteLinkIdFromByInput(
                          {
                            noteId: location.anchorNoteId,
                          },
                          client.cache
                        ),
                      }
                    : null,
                  anchorPosition: location?.anchorPosition ?? null,
                },
                userNoteLink: {
                  __typename: 'UserNoteLink',
                  id: getUserNoteLinkId(noteId, userId),
                  deletedAt: null,
                  categoryName:
                    (location?.categoryName as NoteCategory | undefined) ??
                    NoteCategory.DEFAULT,
                },
              },
              MoveUserNoteLinkPayloadFragmentDoc
            ),
          },
        },
      });
    },
    [moveNoteMutation, client]
  );
}

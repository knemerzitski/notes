import { useApolloClient } from '@apollo/client';
import { useCallback, useMemo } from 'react';

import { gql } from '../../__generated__';
import { MovableNoteCategory } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';
import { useUndoAction } from '../../utils/context/undo-action';
import { useNoteId } from '../context/note-id';
import { getOriginalCategoryName } from '../models/note/original-category-name';
import { getUserNoteLinkId } from '../utils/id';

import { useMoveNote } from './useMoveNote';

import { useTrashNote } from './useTrashNote';

const UseTrashNoteWithUndo_UserNoteLinkFragment = gql(`
  fragment UseTrashNoteWithUndo_UserNoteLinkFragment on UserNoteLink {
    id
  }
`);

export function useTrashNoteWithUndo() {
  const client = useApolloClient();
  const noteId = useNoteId();
  const userId = useUserId();
  const trashNote = useTrashNote();
  const moveNote = useMoveNote();
  const undoAction = useUndoAction();

  const userNoteLinkObservable = useMemo(
    () =>
      client.watchFragment({
        fragment: UseTrashNoteWithUndo_UserNoteLinkFragment,
        from: {
          __typename: 'UserNoteLink',
          id: getUserNoteLinkId(noteId, userId),
        },
      }),
    [noteId, userId, client]
  );

  return useCallback(() => {
    void trashNote({
      noteId,
    });

    const deletedSub = userNoteLinkObservable.subscribe((value) => {
      if (!value.complete) {
        // Note is deleted, close undo action
        closeUndoAction();
      }
    });

    const closeUndoAction = undoAction(
      'Note trashed',
      () => {
        void moveNote(
          { noteId },
          {
            categoryName:
              getOriginalCategoryName({ noteId }, client.cache) ??
              MovableNoteCategory.DEFAULT,
          }
        );
      },
      {
        key: `Note:${noteId}-move`,
        onRemoved: () => {
          deletedSub.unsubscribe();
        },
      }
    );
  }, [trashNote, moveNote, noteId, undoAction, client, userNoteLinkObservable]);
}

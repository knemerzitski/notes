import { useCallback, useMemo } from 'react';
import { useNoteId } from '../context/note-id';
import { useUndoAction } from '../../utils/context/undo-action';
import { useMoveNote } from './useMoveNote';
import { useApolloClient } from '@apollo/client';
import { MovableNoteCategory } from '../../__generated__/graphql';
import { gql } from '../../__generated__';
import { getUserNoteLinkId } from '../utils/id';
import { useUserId } from '../../user/context/user-id';
import { getCategoryName } from '../models/note/category-name';
import { toMovableNoteCategory } from '../utils/note-category';

const UseUnarchiveNoteWithUndo_UserNoteLinkFragment = gql(`
  fragment UseUnarchiveNoteWithUndo_UserNoteLinkFragment on UserNoteLink {
    id
  }
`);

export function useUnarchiveNoteWithUndo() {
  const client = useApolloClient();
  const noteId = useNoteId();
  const userId = useUserId();
  const moveNote = useMoveNote();
  const undoAction = useUndoAction();

  const userNoteLinkObservable = useMemo(
    () =>
      client.watchFragment({
        fragment: UseUnarchiveNoteWithUndo_UserNoteLinkFragment,
        from: {
          __typename: 'UserNoteLink',
          id: getUserNoteLinkId(noteId, userId),
        },
      }),
    [noteId, userId, client]
  );

  return useCallback(() => {
    const oldCategoryName = getCategoryName({ noteId }, client.cache);
    if (!oldCategoryName) {
      return false;
    }

    const oldMovableCategoryName = toMovableNoteCategory(oldCategoryName);
    if (!oldMovableCategoryName) {
      return false;
    }

    if (oldMovableCategoryName === MovableNoteCategory.DEFAULT) {
      return true;
    }

    void moveNote(
      { noteId },
      {
        categoryName: MovableNoteCategory.DEFAULT,
      }
    );

    const deletedSub = userNoteLinkObservable.subscribe((value) => {
      if (!value.complete) {
        // Note is deleted, close undo action
        closeUndoAction();
      }
    });

    const closeUndoAction = undoAction(
      'Note unarchived',
      () => {
        void moveNote(
          {
            noteId,
          },
          {
            categoryName: oldMovableCategoryName,
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

    return true;
  }, [moveNote, noteId, undoAction, client, userNoteLinkObservable]);
}
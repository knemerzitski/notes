import { useApolloClient } from '@apollo/client';
import { useCallback, useMemo } from 'react';

import { gql } from '../../__generated__';
import { MovableNoteCategory } from '../../__generated__/graphql';
import { useUserId } from '../../user/context/user-id';
import { useUndoAction } from '../../utils/context/undo-action';
import { useNoteId } from '../context/note-id';
import { getCategoryName } from '../models/note/category-name';
import { getUserNoteLinkId } from '../utils/id';
import { toMovableNoteCategory } from '../utils/note-category';

import { useMoveNote } from './useMoveNote';

const UseArchiveNoteWithUndo_UserNoteLinkFragment = gql(`
  fragment UseArchiveNoteWithUndo_UserNoteLinkFragment on UserNoteLink {
    id
  }
`);

export function useArchiveNoteWithUndo() {
  const client = useApolloClient();
  const noteId = useNoteId();
  const userId = useUserId();
  const moveNote = useMoveNote();
  const undoAction = useUndoAction();

  const userNoteLinkObservable = useMemo(
    () =>
      client.watchFragment({
        fragment: UseArchiveNoteWithUndo_UserNoteLinkFragment,
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

    if (oldMovableCategoryName === MovableNoteCategory.ARCHIVE) {
      return true;
    }

    void moveNote(
      { noteId },
      {
        categoryName: MovableNoteCategory.ARCHIVE,
      }
    );

    const deletedSub = userNoteLinkObservable.subscribe((value) => {
      if (!value.complete) {
        // Note is deleted, close undo action
        closeUndoAction();
      }
    });

    const closeUndoAction = undoAction(
      'Note archived',
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

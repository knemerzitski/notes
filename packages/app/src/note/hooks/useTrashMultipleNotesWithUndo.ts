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
import { useNoteIds } from '../context/note-ids';

const UseTrashNoteWithUndo_UserNoteLinkFragment = gql(`
  fragment UseTrashNoteWithUndo_UserNoteLinkFragment2 on UserNoteLink {
    id
  }
`);

export function useTrashNoteWithUndo() {
  const client = useApolloClient();
  const noteId = useNoteId(true);
  const noteIds = useNoteIds(true);
  const userId = useUserId();
  const trashNote = useTrashNote();
  const moveNote = useMoveNote();
  const undoAction = useUndoAction();

  const targetNoteIds = noteId ? [noteId] : (noteIds ?? []);

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
    targetNoteIds.forEach((noteId) => {
      void trashNote({
        noteId,
      });
    });

    const deletedSub = userNoteLinkObservable.subscribe((value) => {
      if (!value.complete) {
        // Note is deleted, close undo action
        closeUndoAction();
      }
    });

    const closeUndoAction = undoAction(
      targetNoteIds.length > 1 ? 'Notes trashed ' : 'Note trashed',
      () => {
        targetNoteIds.forEach((noteId) => {
          void moveNote(
            { noteId },
            {
              categoryName:
                getOriginalCategoryName({ noteId }, client.cache) ??
                MovableNoteCategory.DEFAULT,
            }
          );
        });
      },
      {
        key: `Note:${targetNoteIds.join(',')}-move`,
        onRemoved: () => {
          deletedSub.unsubscribe();
        },
      }
    );
  }, [trashNote, moveNote, targetNoteIds, undoAction, client, userNoteLinkObservable]);
}
